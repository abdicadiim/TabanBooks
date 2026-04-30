import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

const SIGNUP_DRAFT_STORAGE_KEY = "taban_signup_draft";
const SIGNUP_PASSWORD_SESSION_KEY = "taban_signup_password";
const PANEL_BG_CLASS = "bg-[#1f6675]";
const PRIMARY_BUTTON_CLASS =
  "bg-[#1f6675] shadow-2xl shadow-[#1f6675]/20 hover:-translate-y-0.5 hover:bg-[#185766]";

type SignupDraft = {
  name?: string;
  email?: string;
  organizationName?: string;
  country?: string;
};

const readSignupDraft = (): SignupDraft | null => {
  try {
    const raw = localStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      name: String(parsed.name || ""),
      email: String(parsed.email || ""),
      organizationName: String(parsed.organizationName || ""),
      country: String(parsed.country || "Somalia"),
    };
  } catch {
    return null;
  }
};

const persistSignupDraft = (data: SignupDraft) => {
  const safeDraft: SignupDraft = {
    name: String(data.name || ""),
    email: String(data.email || ""),
    organizationName: String(data.organizationName || ""),
    country: String(data.country || "Somalia"),
  };

  localStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(safeDraft));
};

const validatePassword = (password: string) => {
  const hasMinLength = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);

  return {
    hasMinLength,
    hasUppercase,
    isValid: hasMinLength && hasUppercase,
  };
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateDraft = ((location.state as any)?.signupDraft || {}) as SignupDraft;
  const [showPassword, setShowPassword] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [formData, setFormData] = useState(() => {
    const storedDraft = readSignupDraft() || {};
    return {
      name: String(stateDraft.name || storedDraft.name || ""),
      email: String(stateDraft.email || storedDraft.email || ""),
      password: "",
      organizationName: String(stateDraft.organizationName || storedDraft.organizationName || ""),
      country: String(stateDraft.country || storedDraft.country || "Somalia"),
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordValidation = validatePassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name !== "password") {
        persistSignupDraft({
          name: next.name,
          email: next.email,
          organizationName: next.organizationName,
          country: next.country,
        });
      }

      return next;
    });

    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      setError("Password must be more than 8 characters and include at least one uppercase letter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const signupDraft: SignupDraft = {
        name: formData.name || formData.organizationName,
        email: formData.email,
        organizationName: formData.organizationName,
        country: formData.country,
      };

      persistSignupDraft(signupDraft);
      sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, formData.password);

      navigate("/onboarding", {
        state: {
          name: formData.name || formData.organizationName,
          organizationName: formData.organizationName,
          email: formData.email,
          password: formData.password,
          country: formData.country,
          signupDraft,
        },
      });
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSignInClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isLeaving) return;

    setIsLeaving(true);
    window.setTimeout(() => {
      navigate("/login");
    }, 260);
  };

  const inputClassName =
    "h-20 w-full rounded-[30px] border border-slate-200 bg-slate-100 px-6 text-base font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-700/10";
  const labelClass = "mb-3 block text-sm font-semibold text-slate-700";

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-50 px-4 py-6 font-sans sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white/90 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
        <div className={`${isLeaving ? "animate-auth-card-exit" : "animate-auth-card"} grid w-full overflow-hidden rounded-[3rem] bg-white shadow-2xl shadow-sky-200/80 lg:w-[1320px] lg:grid-cols-2`}>
          <div className={`${isLeaving ? "animate-auth-panel-exit" : "animate-auth-panel"} relative hidden min-h-full items-center justify-center overflow-hidden px-8 py-10 text-white lg:flex lg:rounded-r-[9rem] ${PANEL_BG_CLASS}`}>
            <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
              <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] text-white/90">
                <ShieldCheck size={20} />
                Secure Signup
              </div>

              <h2 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">Welcome Back</h2>

              <p className="mt-8 max-w-md text-xl leading-[1.7] text-white/85">
                Enter your personal details to continue with Full System and manage everything in
                one place.
              </p>

              <Link
                to="/login"
                onClick={handleSignInClick}
                className="mt-14 inline-flex min-h-[76px] min-w-[320px] items-center justify-center rounded-full border border-white/30 px-10 text-lg font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>

          <section className={`${isLeaving ? "animate-auth-form-exit" : "animate-auth-form"} flex items-center px-8 py-8 sm:px-10 lg:px-14 xl:px-16`}>
            <div className="w-full max-w-2xl">
              <div className="mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-[#16213d] sm:text-5xl">
                  Create Account
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-500">
                  Use your email and password to create your workspace.
                </p>
              </div>

              {error ? (
                <div className="mb-8 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className={labelClass}>Company Name</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      required
                      autoComplete="organization"
                      placeholder="Taban Enterprise"
                      className={`${inputClassName} pl-16`}
                    />
                  </div>
                </div>

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
                      autoComplete="email"
                      placeholder="info@taban.so"
                      className={`${inputClassName} pl-16`}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    We&apos;ll let you know if this email is already in use.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      minLength={9}
                      pattern="(?=.*[A-Z]).{9,}"
                      title="Password must be more than 8 characters and include at least one uppercase letter."
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
                  <p className="mt-3 text-xs text-slate-500">
                    Use 9+ characters and include at least one uppercase letter.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-3 rounded-[26px] px-8 py-5 text-lg font-bold text-white transition-all duration-300 disabled:transform-none disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
                >
                  <span>{loading ? "Creating..." : "Sign Up"}</span>
                  <ArrowRight size={24} />
                </button>
              </form>
            </div>
          </section>
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

            @keyframes authCardExit {
              from { opacity: 1; transform: translateY(0) scale(1); }
              to { opacity: 0; transform: translateY(-12px) scale(0.992); }
            }

            @keyframes authPanelExit {
              from { opacity: 1; transform: translateX(0); }
              to { opacity: 0; transform: translateX(-22px); }
            }

            @keyframes authFormExit {
              from { opacity: 1; transform: translateX(0); }
              to { opacity: 0; transform: translateX(22px); }
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

            .animate-auth-card-exit {
              animation: authCardExit 0.26s ease-in both;
            }

            .animate-auth-panel-exit {
              animation: authPanelExit 0.22s ease-in both;
            }

            .animate-auth-form-exit {
              animation: authFormExit 0.22s ease-in both;
            }
          `,
        }}
      />
    </div>
  );
}
