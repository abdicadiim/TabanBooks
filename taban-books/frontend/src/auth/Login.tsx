import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { checkUser, login, sendLoginOTP, verifyLoginOTP } from "../services/auth";
import FullScreenLoader from "../components/FullScreenLoader";

const APP_NAME = "Taban Books";
const RIGHT_PANEL_TITLE = "Taban Books";
const PANEL_BG_CLASS = "bg-[#1f6675]";
const PRIMARY_BUTTON_CLASS =
  "bg-[#1f6675] shadow-2xl shadow-[#1f6675]/20 hover:-translate-y-0.5 hover:bg-[#185766]";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<1 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [userStatus, setUserStatus] = useState({ hasPassword: true, isInvited: false });

  useEffect(() => {
    if (location.state?.email && location.state?.step === 3) {
      setFormData((prev) => ({ ...prev, email: String(location.state.email || "") }));
      setUserStatus({ hasPassword: false, isInvited: true });
      setStep(3);
      setTimer(60);
    }
  }, [location.state]);

  useEffect(() => {
    let interval: number | undefined;

    if (step === 3 && timer > 0) {
      interval = window.setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [step, timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "otp" ? value.replace(/\D/g, "").slice(0, 6) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    if (error) setError("");
  };

  const navigateAfterAuth = (organization?: { isVerified?: boolean }) => {
    navigate(organization?.isVerified === true ? "/loading" : "/verify-identity");
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const status = await checkUser(formData.email);
      setUserStatus(status);

      if (!status.hasPassword) {
        await sendLoginOTP(formData.email);
        setStep(3);
        setTimer(60);
        setFormData((prev) => ({ ...prev, password: "", otp: "" }));
        return;
      }

      const authResponse = await login(formData.email, formData.password);
      navigateAfterAuth(authResponse?.organization);
    } catch (err: any) {
      let errorMessage = err.message || "Login failed. Please check your credentials.";
      if (
        errorMessage.includes("Backend server is not running") ||
        errorMessage.includes("Cannot connect")
      ) {
        errorMessage = "Cannot connect to backend server. Please ensure the server is running.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithOTP = async () => {
    if (!formData.email || loading) return;

    setLoading(true);
    setError("");

    try {
      const status = await checkUser(formData.email);
      setUserStatus(status);
      await sendLoginOTP(formData.email);
      setStep(3);
      setTimer(60);
      setFormData((prev) => ({ ...prev, otp: "" }));
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp || loading) return;

    setLoading(true);
    setError("");

    try {
      const authResponse = await verifyLoginOTP(formData.email, formData.otp);
      navigateAfterAuth(authResponse?.organization);
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0 || loading) return;

    try {
      await sendLoginOTP(formData.email);
      setTimer(60);
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  const resetToPasswordView = () => {
    setStep(1);
    setFormData((prev) => ({ ...prev, otp: "" }));
  };

  const maskEmail = (email: string) => {
    if (!email) return "";

    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return email;

    const maskedName = name.slice(0, 2) + "*".repeat(name.length - 2);
    const [domainName, domainExt] = domain.split(".");
    const maskedDomain = domainName
      ? domainName.slice(0, 1) + "*".repeat(Math.max(domainName.length - 1, 0))
      : domain;

    return `${maskedName}@${maskedDomain}.${domainExt || "com"}`;
  };

  const loaderSubtitle = step === 3 ? "Verifying your code..." : "Signing you in...";
  const inputClassName =
    "h-20 w-full rounded-[30px] border border-slate-200 bg-slate-100 px-6 text-base font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-700/10";
  const leftLabelClass = "mb-3 block text-sm font-semibold text-slate-700";

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-50 px-4 py-6 font-sans sm:px-6 lg:px-10">
      {loading ? <FullScreenLoader subtitle={loaderSubtitle} /> : null}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white/90 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
        <div className="animate-auth-card grid w-full overflow-hidden rounded-[3rem] bg-white shadow-2xl shadow-sky-200/80 lg:w-[1320px] lg:grid-cols-2">
          <section className="animate-auth-form flex items-center px-8 py-8 sm:px-10 lg:px-14 xl:px-16">
            <div className="w-full max-w-2xl">
              <div className="mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-[#16213d] sm:text-5xl">Sign In</h1>
                <p className="mt-4 text-base leading-7 text-slate-500">
                  {step === 3
                    ? `Enter the code we sent to ${maskEmail(formData.email)} to continue to your workspace.`
                    : "Use your email and password to continue to your workspace."}
                </p>
              </div>

              {step === 3 ? (
                <div className="mb-8 flex items-start gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">OTP sent successfully.</p>
                    <p className="mt-1 text-emerald-700/90">Check your inbox and enter the latest code below.</p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mb-8 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              {step === 1 ? (
                <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
                  <div>
                    <label className={leftLabelClass}>Email Address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        placeholder="info@taban.so"
                        className={`${inputClassName} pl-16`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={leftLabelClass}>Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className={`${inputClassName} pl-16 pr-16`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-1 text-base font-semibold text-blue-600 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleSignInWithOTP}
                      disabled={loading}
                      className="text-left transition-colors hover:text-blue-700 disabled:opacity-60"
                    >
                      Sign in using email OTP
                    </button>
                    <Link
                      to={formData.email ? `/forgot-password?email=${encodeURIComponent(formData.email)}` : "/forgot-password"}
                      className="text-left transition-colors hover:text-blue-700 sm:text-right"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-3 rounded-[26px] px-8 py-5 text-lg font-bold text-white transition-all disabled:transform-none disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
                  >
                    <span>{loading ? "Signing in..." : "Sign in"}</span>
                    <ArrowRight size={24} />
                  </button>
                </form>
              ) : null}

              {step === 3 ? (
                <form className="space-y-6" onSubmit={handleVerifyOTP}>
                  <div>
                    <label className={leftLabelClass}>Email Address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={`${inputClassName} pl-16 pr-24`}
                      />
                      <button
                        type="button"
                        onClick={resetToPasswordView}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={leftLabelClass}>One-Time Password</label>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="otp"
                        value={formData.otp}
                        onChange={handleChange}
                        required
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        className={`${inputClassName} pl-16 pr-6 text-lg font-bold tracking-widest`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-1 text-base font-semibold text-blue-600 sm:flex-row sm:items-center sm:justify-between">
                    {userStatus.hasPassword ? (
                      <button
                        type="button"
                        onClick={resetToPasswordView}
                        className="text-left transition-colors hover:text-blue-700"
                      >
                        Use password instead
                      </button>
                    ) : (
                      <span />
                    )}

                    {timer > 0 ? (
                      <span className="text-base font-medium text-slate-500">Resend in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        className="text-left transition-colors hover:text-blue-700"
                      >
                        Resend code
                      </button>
                    )}
                  </div>

                  {!userStatus.hasPassword ? (
                    <div className="flex items-start gap-3 rounded-3xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
                      <Info size={18} className="mt-0.5 shrink-0 text-sky-600" />
                      <div>
                        <p className="font-semibold">This account uses secure email verification.</p>
                        <p className="mt-1 text-sky-700/90">Complete this step to access your workspace.</p>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || formData.otp.length < 4}
                    className={`mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-3 rounded-[26px] px-8 py-5 text-lg font-bold text-white transition-all disabled:transform-none disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
                  >
                    <span>{loading ? "Verifying..." : "Verify"}</span>
                    <ArrowRight size={24} />
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <div className={`animate-auth-panel relative hidden min-h-full items-center justify-center overflow-hidden px-8 py-10 text-white lg:flex lg:rounded-l-[9rem] ${PANEL_BG_CLASS}`}>
            <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
              <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] text-white/90">
                <ShieldCheck size={20} />
                Secure Login
              </div>

              <h2 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                {RIGHT_PANEL_TITLE}
              </h2>

              <p className="mt-8 max-w-md text-xl leading-[1.7] text-white/85">
                Create your account to start using Full System with the same secure workspace and
                tools.
              </p>

              <Link
                to="/signup"
                className="mt-14 inline-flex min-h-[76px] min-w-[320px] items-center justify-center rounded-full border border-white/30 px-10 text-lg font-bold text-white transition-colors hover:bg-white/10"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes authCardReveal {
              from { opacity: 0; transform: translateY(18px) scale(0.985); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes authPanelReveal {
              from { opacity: 0; transform: translateX(-26px); }
              to { opacity: 1; transform: translateX(0); }
            }

            @keyframes authFormReveal {
              from { opacity: 0; transform: translateX(26px); }
              to { opacity: 1; transform: translateX(0); }
            }

            .animate-auth-card {
              animation: authCardReveal 0.65s ease-out both;
            }

            .animate-auth-panel {
              animation: authPanelReveal 0.8s ease-out both;
            }

            .animate-auth-form {
              animation: authFormReveal 0.8s ease-out both;
            }
          `,
        }}
      />
    </div>
  );
}
