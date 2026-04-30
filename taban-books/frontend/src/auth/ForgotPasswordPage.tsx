import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import FullScreenLoader from "../components/FullScreenLoader";
import { API_BASE_URL } from "../services/auth";

type Step = "request" | "verify" | "reset";

type ApiResult<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const APP_NAME = "Taban Books";
const RIGHT_PANEL_TITLE = "Welcome to Taban Books";
const PANEL_BG_CLASS = "bg-[#1f6675]";
const PRIMARY_BUTTON_CLASS =
  "bg-[#1f6675] shadow-2xl shadow-[#1f6675]/20 hover:-translate-y-0.5 hover:bg-[#185766]";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

async function postAuth<T = unknown>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(text?.slice(0, 120) || `Request failed (${response.status})`);
  }

  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const initialEmail = String(searchParams.get("email") || "");
  const app = String(searchParams.get("app") || "");

  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    email: initialEmail,
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    if (error) setError("");
    if (successMessage) setSuccessMessage("");
  };

  const requestResetCode = async () => {
    const email = formData.email.trim();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await postAuth<{ expiresInSeconds?: number }>("/auth/password/reset-request", {
        email,
        app,
      });

      setRemainingSeconds(Math.max(0, Number(result.data?.expiresInSeconds ?? 90)));
      setStep("verify");
      setSuccessMessage("Reset code sent. Check your email and enter the code below.");
    } catch (err: any) {
      setError(err?.message || "Unable to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async () => {
    const email = formData.email.trim();
    const code = formData.code.trim();

    if (!email || !code) {
      setError("Please enter your email address and reset code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await postAuth("/auth/password/reset-verify", { email, code });
      setStep("reset");
      setSuccessMessage("Code verified. Create your new password.");
    } catch (err: any) {
      setError(err?.message || "Reset code verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const email = formData.email.trim();
    const code = formData.code.trim();
    const newPassword = formData.newPassword;
    const confirmPassword = formData.confirmPassword;

    if (!email || !code || !newPassword || !confirmPassword) {
      setError("Please complete all fields before continuing.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await postAuth("/auth/password/reset", {
        email,
        code,
        newPassword,
      });

      navigate("/login", {
        replace: true,
        state: { email },
      });
    } catch (err: any) {
      setError(err?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "request") {
      await requestResetCode();
      return;
    }

    if (step === "verify") {
      await verifyResetCode();
      return;
    }

    await resetPassword();
  };

  const stepTitle =
    step === "request" ? "Forgot Password?" : step === "verify" ? "Verify Code" : "Create New Password";

  const stepDescription =
    step === "request"
      ? `We’ll send a reset code to the email address linked to your ${APP_NAME} workspace.`
      : step === "verify"
        ? "Enter the 6-digit reset code sent to your email to continue."
        : "Choose a new password for your workspace and sign back in securely.";

  const submitLabel =
    loading
      ? step === "request"
        ? "Sending code..."
        : step === "verify"
          ? "Verifying..."
          : "Resetting..."
      : step === "request"
        ? "Send reset code"
        : step === "verify"
          ? "Verify code"
          : "Reset password";

  const inputClassName =
    "h-20 w-full rounded-[30px] border border-slate-200 bg-slate-100 px-6 text-lg font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-700/10";
  const labelClass = "mb-4 block text-[19px] font-semibold text-slate-700";

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-50 px-4 py-6 font-sans sm:px-6 lg:px-10">
      {loading ? <FullScreenLoader subtitle={step === "request" ? "Sending reset code..." : step === "verify" ? "Verifying reset code..." : "Updating your password..."} /> : null}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white/90 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[3rem] bg-white shadow-2xl shadow-sky-200/80 lg:grid-cols-2">
          <section className="flex items-center px-8 py-10 sm:px-12 lg:px-16 xl:px-20">
            <div className="w-full max-w-xl">
              <div className="mb-14">
                <h1 className="text-6xl font-bold tracking-tight text-[#16213d] sm:text-7xl">{stepTitle}</h1>
                <p className="mt-7 text-xl leading-9 text-slate-500">{stepDescription}</p>
              </div>

              {successMessage ? (
                <div className="mb-8 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              {error ? (
                <div className="mb-8 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="info@taban.so"
                      readOnly={step !== "request"}
                      className={`${inputClassName} pl-16 ${step !== "request" ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
                    />
                  </div>
                </div>

                {step === "verify" || step === "reset" ? (
                  <div>
                    <label className={labelClass}>Reset Code</label>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        readOnly={step === "reset"}
                        className={`${inputClassName} pl-16 pr-6 text-xl font-bold tracking-widest ${step === "reset" ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
                      />
                    </div>
                    {step === "verify" ? (
                      <div className="mt-4 flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
                        <p className={remainingSeconds > 0 ? "text-slate-500" : "text-rose-600"}>
                          {remainingSeconds > 0
                            ? `Code expires in ${Math.floor(remainingSeconds / 60)
                                .toString()
                                .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                            : "Code expired. Please resend the code."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void requestResetCode();
                          }}
                          className="text-left text-lg font-semibold text-blue-600 transition-colors hover:text-blue-700"
                        >
                          Resend code
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {step === "reset" ? (
                  <>
                    <div>
                      <label className={labelClass}>New Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          required
                          placeholder="Enter your new password"
                          className={`${inputClassName} pl-16 pr-16`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                        >
                          {showNewPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Confirm Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          placeholder="Confirm your new password"
                          className={`${inputClassName} pl-16 pr-16`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-col gap-4 pt-1 text-xl font-semibold text-blue-600 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/login" className="text-left transition-colors hover:text-blue-700">
                    Back to Sign In
                  </Link>
                  {step !== "request" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStep("request");
                        setRemainingSeconds(0);
                        setSuccessMessage("");
                        setError("");
                        setFormData((prev) => ({
                          ...prev,
                          code: "",
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }}
                      className="text-left transition-colors hover:text-blue-700 sm:text-right"
                    >
                      Start again
                    </button>
                  ) : (
                    <span />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`mx-auto mt-6 flex w-full max-w-sm items-center justify-center gap-3 rounded-[26px] px-8 py-6 text-2xl font-bold text-white transition-all disabled:transform-none disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
                >
                  <span>{submitLabel}</span>
                  <ArrowRight size={24} />
                </button>
              </form>
            </div>
          </section>

          <div className={`relative hidden min-h-full items-center justify-center overflow-hidden px-10 py-12 text-white lg:flex lg:rounded-l-[9rem] ${PANEL_BG_CLASS}`}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute right-8 top-8 h-40 w-40 rounded-full border border-white/10" />
            </div>

            <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
              <div className="mb-12 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-lg font-bold uppercase tracking-[0.25em] text-white/90">
                <ShieldCheck size={20} />
                Secure Login
              </div>

              <h2 className="text-6xl font-bold leading-tight tracking-tight text-white">
                {RIGHT_PANEL_TITLE}
              </h2>

              <p className="mt-10 max-w-md text-3xl leading-[1.7] text-white/85">
                Create your account to start using Taban Books with the same secure workspace and
                tools.
              </p>

              <Link
                to="/signup"
                className="mt-16 inline-flex min-h-[76px] min-w-[320px] items-center justify-center rounded-full border border-white/30 px-10 text-2xl font-bold text-white transition-colors hover:bg-white/10"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
