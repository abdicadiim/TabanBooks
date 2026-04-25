/**
 * Authentication Controller
 * Handles signup, login, logout
 */

import { Request, Response } from "express";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Profile from "../models/Profile.js";
import Branding from "../models/Branding.js";
import Currency from "../models/Currency.js";
import SenderEmail from "../models/SenderEmail.js";
import Role from "../models/Role.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logRequest, logResponse, logError, logDatabase } from "../utils/debug.js";
import { sendOTPEmail } from "../utils/email.js";
import { getUserPermissions } from "../utils/permissionChecker.js";
import { ensureDefaultChartOfAccounts } from "../utils/defaultChartOfAccounts.js";
import { primeHomeDashboardBootstrapCache } from "./dashboard.controller.js";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";
import {
  ensureOrganizationBaseCurrency,
  ensureOrganizationIdentity,
  findOrCreateOrganizationProfile,
} from "../services/organizationResource.service.js";

dotenv.config();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    organizationIds?: string[];
    organizationExternalId?: string;
  };
}

interface SignupBody {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const normalizeEmail = (email: string = ""): string => String(email || "").trim().toLowerCase();

const DEFAULT_BRANDING = {
  appearance: "dark",
  accentColor: "#3b82f6",
  sidebarDarkFrom: "#0f4e5a",
  sidebarDarkTo: "#156372",
  sidebarLightFrom: "#f9fafb",
  sidebarLightTo: "#f3f4f6",
  keepZohoBranding: false,
  logo: "",
} as const;

const AUTH_BOOTSTRAP_RESOURCE = "auth-bootstrap";

const normalizeRoleName = (role = "") => String(role || "").trim().toLowerCase().replace(/\s+/g, "_");

const buildRoleCandidates = (role = "") => {
  const normalizedRole = normalizeRoleName(role);
  return Array.from(
    new Set([
      String(role || "").trim(),
      normalizedRole,
      normalizedRole.replace(/_/g, " "),
    ]),
  ).filter(Boolean);
};

const getBootstrapVersionState = async (userId: string, organizationId: string, role: string) => {
  const normalizedRole = normalizeRoleName(role);
  const [user, organization, profile, branding, baseCurrency, roleDocument] = await Promise.all([
    User.findById(userId).select("_id updatedAt role").lean(),
    Organization.findById(organizationId).select("_id updatedAt isVerified organizationId").lean(),
    Profile.findOne({ organization: organizationId }).select("_id updatedAt logo").lean(),
    Branding.findOne({ organization: organizationId }).select("_id updatedAt appearance accentColor").lean(),
    Currency.findOne({ organization: organizationId, isBaseCurrency: true }).select("_id updatedAt code").lean(),
    normalizedRole === "owner" || normalizedRole === "admin"
      ? Promise.resolve(null)
      : Role.findOne({
          organization: organizationId,
          isActive: true,
          name: { $in: buildRoleCandidates(role) },
        })
          .select("_id updatedAt name")
          .lean(),
  ]);

  return buildResourceVersion(AUTH_BOOTSTRAP_RESOURCE, [
    {
      key: "user",
      id: user?._id ? String(user._id) : "",
      updatedAt: (user as any)?.updatedAt,
      extra: user?.role || role,
    },
    {
      key: "organization",
      id: organization?._id ? String(organization._id) : "",
      updatedAt: (organization as any)?.updatedAt,
      extra: `${Boolean((organization as any)?.isVerified)}:${String((organization as any)?.organizationId || "")}`,
    },
    {
      key: "profile",
      id: profile?._id ? String(profile._id) : "",
      updatedAt: profile?.updatedAt,
      extra: String((profile as any)?.logo || ""),
    },
    {
      key: "branding",
      id: branding?._id ? String(branding._id) : "",
      updatedAt: (branding as any)?.updatedAt,
      extra: `${String((branding as any)?.appearance || "")}:${String((branding as any)?.accentColor || "")}`,
    },
    {
      key: "base_currency",
      id: baseCurrency?._id ? String(baseCurrency._id) : "",
      updatedAt: (baseCurrency as any)?.updatedAt,
      extra: String((baseCurrency as any)?.code || ""),
    },
    {
      key: "role",
      id: roleDocument?._id ? String(roleDocument._id) : "",
      updatedAt: roleDocument?.updatedAt,
      extra: String((roleDocument as any)?.name || normalizedRole),
    },
  ]);
};

/**
 * Generate JWT token
 */
const generateToken = (userId: string | any): string => {
  return jwt.sign(
    { userId },
    (process.env.JWT_SECRET || "your-secret-key-change-in-production") as jwt.Secret,
    {
      expiresIn: ((process.env.JWT_EXPIRE as any) || "7d") as any,
    } as jwt.SignOptions
  );
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user and organization
 */
export const signup = async (req: Request<{}, {}, SignupBody>, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: 'signup', action: 'user_registration' });

    const { name, password, organizationName } = req.body;
    const email = normalizeEmail(req.body.email);

    // Validate input
    if (!name || !email || !password || !organizationName) {
      logError(new Error("Missing required fields"), { controller: 'signup', body: req.body });
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    // Check if user exists
    logDatabase('findOne', { collection: 'users', query: { email } });
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logError(new Error("User already exists"), { controller: 'signup', email });
      res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
      return;
    }

    // Create organization
    logDatabase('create', { collection: 'organizations', data: { name: organizationName, email } });
    const organization = await Organization.create({
      name: organizationName,
      email,
    });
    await ensureOrganizationIdentity(organization);
    await ensureOrganizationBaseCurrency(organization._id, organization.currency);

    try {
      await ensureDefaultChartOfAccounts({
        organizationId: organization._id,
        currency: organization.currency,
      });
    } catch (chartSeedError: any) {
      logError(chartSeedError, {
        controller: "signup",
        organizationId: organization._id,
        step: "seed_default_chart_of_accounts",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    logDatabase('create', { collection: 'users', data: { name, email, organization: organization._id, role: 'owner' } });
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      organization: organization._id,
      organizationMemberships: [organization._id],
      role: "owner",
      verificationCode: otp,
      verificationCodeExpires: otpExpires,
    });

    // Create default sender email for the organization
    // Do NOT fill SMTP credentials here - it will fall back to .env by default
    // unless the user configures custom SMTP settings in the UI later
    try {
      await SenderEmail.create({
        organization: organization._id,
        name: organizationName,
        email: email,
        isPrimary: true,
        isVerified: true
      });
      console.log(`✅ Created default sender email for organization: ${organizationName}`);
    } catch (senderEmailError: any) {
      console.error("⚠️ Failed to create default sender email:", senderEmailError.message);
      // Don't fail signup if sender email creation fails
    }

    // Send OTP Email
    const otpEmailSent = await sendOTPEmail(email, otp, organization._id.toString());

    // Generate token
    const token = generateToken(user._id);

    const responseData = {
      success: true,
      message: otpEmailSent
        ? "User registered successfully"
        : "User registered but verification email could not be sent. Please use resend code.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        organization: {
          id: organization._id,
          organization_id: organization.organizationId || "",
          name: organization.name,
          logo: "", // New organization starts with no logo
          isVerified: organization.isVerified,
        },
        otpEmailSent,
        token,
      },
    };

    logResponse(req, res, responseData, { controller: 'signup', userId: user._id });
    res.status(201).json(responseData);
  } catch (error: any) {
    logError(error, { controller: 'signup', body: req.body });
    res.status(500).json({
      success: false,
      message: error.message || "Error registering user",
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 */
export const login = async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: 'login', action: 'user_authentication' });

    const password = req.body.password;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      logError(new Error("Missing email or password"), { controller: 'login' });
      res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
      return;
    }

    // Find user and include password
    logDatabase('findOne', { collection: 'users', query: { email } });
    const user = await User.findOne({ email }).select("+password").populate("organization");

    if (!user || !(await user.comparePassword(password))) {
      logError(new Error("Invalid credentials"), { controller: 'login', email });
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check deactivation
    // Allow login if user is inactive BUT has never logged in (Invited status)
    if (!user.isActive && user.lastLogin) {
      logError(new Error("Account deactivated"), { controller: 'login', userId: user._id });
      res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
      return;
    }

    // Update last login and activate user if this was their first login (Invited -> Active)
    logDatabase('update', { collection: 'users', userId: user._id, update: { lastLogin: new Date(), isActive: true } });

    if (!user.isActive && !user.lastLogin) {
      user.isActive = true;
    }
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    const permissions = await getUserPermissions(user._id);

    // Get organization logo
    const profile = await Profile.findOne({ organization: (user.organization as any)._id });

    const organizationIsVerified = Boolean((user.organization as any)?.isVerified);

    const responseData = {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
        },
        organization: {
          id: (user.organization as any)._id,
          name: (user.organization as any).name,
          logo: profile?.logo || "",
          isVerified: organizationIsVerified,
        },
        requiresVerification: !organizationIsVerified,
        token,
      },
    };

    void primeHomeDashboardBootstrapCache(String((user.organization as any)._id));

    logResponse(req, res, responseData, { controller: 'login', userId: user._id });
    res.json(responseData);
  } catch (error: any) {
    logError(error, { controller: 'login', email: req.body.email });
    res.status(500).json({
      success: false,
      message: error.message || "Error logging in",
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: 'getMe', action: 'get_current_user' });

    if (!req.user?.userId) {
      logError(new Error("User not authenticated"), { controller: 'getMe' });
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    logDatabase('findById', { collection: 'users', userId: req.user.userId });
    const user = await User.findById(req.user.userId);

    if (!user) {
      logError(new Error("User not found"), { controller: 'getMe', userId: req.user.userId });
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const [organization, profile] = await Promise.all([
      Organization.findById(req.user.organizationId),
      Profile.findOne({ organization: req.user.organizationId }),
    ]);

    if (!organization) {
      logError(new Error("Organization not found"), { controller: 'getMe', organizationId: req.user.organizationId });
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    await ensureOrganizationIdentity(organization);

    const permissions = await getUserPermissions(user._id);

    const responseData = {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          permissions,
        },
        organization: {
          id: organization._id,
          organization_id: organization.organizationId || "",
          name: organization.name,
          logo: profile?.logo || "",
          isVerified: organization.isVerified,
        },
      },
    };

    logResponse(req, res, responseData, { controller: 'getMe', userId: user._id });
    res.json(responseData);
  } catch (error: any) {
    logError(error, { controller: 'getMe', userId: req.user?.userId });
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching user",
    });
  }
};

/**
 * @route   PATCH /api/auth/me
 * @desc    Persist lightweight session-scoped user state such as the active timer
 */
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: "updateMe", action: "update_current_user" });

    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const nextTimerState = (req.body as Record<string, unknown>)?.activeTimer;
    if (nextTimerState !== undefined) {
      const currentProfile = (user.profile as Record<string, unknown> | undefined) || {};
      user.profile = {
        ...(currentProfile as any),
        activeTimer: nextTimerState,
        activeTimerUpdatedAt: new Date(),
      } as any;
      await user.save();
    }

    const [organization, profile] = await Promise.all([
      Organization.findById(req.user.organizationId),
      Profile.findOne({ organization: req.user.organizationId }),
    ]);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    const permissions = await getUserPermissions(user._id);

    const responseData = {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          permissions,
        },
        organization: {
          id: organization._id,
          organization_id: organization.organizationId || "",
          name: organization.name,
          logo: profile?.logo || "",
          isVerified: organization.isVerified,
        },
      },
    };

    logResponse(req, res, responseData, { controller: "updateMe", userId: user._id });
    res.json(responseData);
  } catch (error: any) {
    logError(error, { controller: "updateMe", userId: req.user?.userId });
    res.status(500).json({
      success: false,
      message: error.message || "Error updating user state",
    });
  }
};

/**
 * @route   GET /api/auth/bootstrap
 * @desc    Get consolidated app bootstrap payload
 */
export const getBootstrap = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: "getBootstrap", action: "get_app_bootstrap" });

    if (!req.user?.userId || !req.user?.organizationId) {
      logError(new Error("User not authenticated"), { controller: "getBootstrap" });
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const versionState = await getBootstrapVersionState(
      req.user.userId,
      req.user.organizationId,
      req.user.role || "staff",
    );
    applyResourceVersionHeaders(res, versionState);

    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    const [user, organization, existingProfile, branding, baseCurrencyDoc] = await Promise.all([
      User.findById(req.user.userId),
      Organization.findById(req.user.organizationId),
      Profile.findOne({ organization: req.user.organizationId }),
      Branding.findOne({ organization: req.user.organizationId }).lean(),
      Currency.findOne({
        organization: req.user.organizationId,
        isBaseCurrency: true,
      }).lean(),
    ]);

    if (!user) {
      logError(new Error("User not found"), { controller: "getBootstrap", userId: req.user.userId });
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!organization) {
      logError(new Error("Organization not found"), { controller: "getBootstrap", userId: req.user.userId });
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    await ensureOrganizationIdentity(organization);
    const profile = existingProfile || (await findOrCreateOrganizationProfile(organization));
    const permissions =
      user.role === "owner" || user.role === "admin"
        ? { fullAccess: true, role: user.role }
        : await getUserPermissions(user._id);

    const resolvedBaseCurrency =
      baseCurrencyDoc || (await ensureOrganizationBaseCurrency(organization._id, organization.currency));
    const fallbackCurrencyCode = String(resolvedBaseCurrency?.code || organization.currency || "USD").toUpperCase();
    const fallbackCurrencyName = String(resolvedBaseCurrency?.name || fallbackCurrencyCode);
    const fallbackCurrencySymbol = String(resolvedBaseCurrency?.symbol || fallbackCurrencyCode || "$");
    const bootstrapBranding = {
      ...DEFAULT_BRANDING,
      ...(branding || {}),
      appearance: branding?.appearance === "light" ? "light" : DEFAULT_BRANDING.appearance,
      logo: String(profile?.logo || ""),
    };

    const responseData = {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          permissions: permissions || null,
        },
        organization: {
          id: organization._id,
          organization_id: organization.organizationId || "",
          name: organization.name,
          legalName: organization.legalName || "",
          logo: profile?.logo || "",
          isVerified: Boolean(organization.isVerified),
        },
        branding: bootstrapBranding,
        generalSettings: {
          currency: organization.currency,
          fiscalYearStart: organization.fiscalYearStart,
          settings: organization.settings,
          subscription: organization.subscription,
        },
        baseCurrency: {
          id: String(resolvedBaseCurrency?._id || ""),
          code: fallbackCurrencyCode,
          name: fallbackCurrencyName,
          symbol: fallbackCurrencySymbol,
          isBase: true,
        },
        resource: AUTH_BOOTSTRAP_RESOURCE,
        version_id: versionState.version_id,
        last_updated: versionState.last_updated,
      },
    };

    logResponse(req, res, responseData, { controller: "getBootstrap", userId: user._id });
    res.json(responseData);
  } catch (error: any) {
    logError(error, { controller: "getBootstrap", userId: req.user?.userId });
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching bootstrap payload",
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  logRequest(req, { controller: 'logout', action: 'user_logout' });
  logResponse(req, res, { success: true, message: "Logged out successfully" }, { controller: 'logout' });
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * @route   POST /api/auth/verify-account
 * @desc    Verify organization account using OTP
 */
export const verifyAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logRequest(req, { controller: 'verifyAccount', action: 'verify_organization' });

    const { otp } = req.body;

    if (!otp) {
      res.status(400).json({ success: false, message: "Please provide verification code" });
      return;
    }

    if (!req.user?.userId || !req.user?.organizationId) {
      logError(new Error("User not authenticated or no organization"), { controller: 'verifyAccount' });
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check OTP
    if (user.verificationCode !== otp) {
      res.status(400).json({ success: false, message: "Invalid verification code" });
      return;
    }

    // Check expiry
    if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
      res.status(400).json({ success: false, message: "Verification code has expired" });
      return;
    }

    // Clear OTP and verify organization
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    logDatabase('findByIdAndUpdate', { collection: 'organizations', id: req.user.organizationId, update: { isVerified: true } });
    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { isVerified: true },
      { new: true }
    );

    if (!organization) {
      logError(new Error("Organization not found"), { controller: 'verifyAccount', id: req.user.organizationId });
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    logResponse(req, res, { success: true, message: "Account verified successfully" }, { controller: 'verifyAccount', organizationId: organization._id });
    res.json({
      success: true,
      message: "Account verified successfully",
      data: {
        isVerified: organization.isVerified,
      },
    });
  } catch (error: any) {
    logError(error, { controller: 'verifyAccount' });
    res.status(500).json({
      success: false,
      message: error.message || "Error verifying account",
    });
  }
};

/**
 * @route   POST /api/auth/check-user
 * @desc    Check if user exists and if they have a password
 */
export const checkUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }

    // Check if password is set - newly invited users might have a system-generated password
    // but the intention is to treat them as having no password set yet.
    const isInvited = !user.isActive && !user.lastLogin;

    res.json({
      success: true,
      data: {
        email: user.email,
        hasPassword: !isInvited,
        isInvited
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/auth/send-login-otp
 * @desc    Send OTP for login (passwordless)
 */
export const sendLoginOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationCode = otp;
    user.verificationCodeExpires = otpExpires;
    await user.save();

    // Send OTP Email
    const otpEmailSent = await sendOTPEmail(email, otp, user.organization.toString());
    if (!otpEmailSent) {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please verify SMTP settings and try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/auth/verify-login-otp
 * @desc    Verify OTP for login and return token
 */
export const verifyLoginOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: "Email and OTP are required" });
      return;
    }

    const user = await User.findOne({ email }).populate("organization");
    if (!user) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }

    // Check OTP
    if (user.verificationCode !== otp) {
      res.status(400).json({ success: false, message: "Invalid verification code" });
      return;
    }

    // Check expiry
    if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
      res.status(400).json({ success: false, message: "Verification code has expired" });
      return;
    }

    // Success! Clear OTP and activate user
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    // Update last login and activate user if this was their first login
    if (!user.isActive && !user.lastLogin) {
      user.isActive = true;
    }
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    const permissions = await getUserPermissions(user._id);

    // Get organization logo
    const profile = await Profile.findOne({ organization: (user.organization as any)._id });

    const organizationIsVerified = Boolean((user.organization as any)?.isVerified);

    void primeHomeDashboardBootstrapCache(String((user.organization as any)._id));

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
        },
        organization: {
          id: (user.organization as any)._id,
          name: (user.organization as any).name,
          logo: profile?.logo || "",
          isVerified: organizationIsVerified,
        },
        requiresVerification: !organizationIsVerified,
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend verification code
 */
export const resendOTP = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationCode = otp;
    user.verificationCodeExpires = otpExpires;
    await user.save();

    // Send OTP Email
    const otpEmailSent = await sendOTPEmail(user.email, otp, user.organization.toString());
    if (!otpEmailSent) {
      res.status(500).json({
        success: false,
        message: "Failed to resend verification code email. Please verify SMTP settings and try again.",
      });
      return;
    }

    res.json({ success: true, message: "Verification code resent successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Error resending code" });
  }
};


