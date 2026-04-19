import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Building2, Mail, Lock, Globe, ChevronDown, Eye, EyeOff } from "lucide-react";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe"
];

// Reusable color constant for the "Green Dark" / Teal theme
const THEME_COLOR = "#0f4e5a";
const SIGNUP_DRAFT_STORAGE_KEY = "taban_signup_draft";
const SIGNUP_PASSWORD_SESSION_KEY = "taban_signup_password";

type SignupDraft = {
  name?: string;
  email?: string;
  organizationName?: string;
  country?: string;
};

const sanitizeCountry = (value: any): string => {
  const normalized = String(value || "").trim();
  return COUNTRIES.includes(normalized) ? normalized : "Bolivia";
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
      country: sanitizeCountry(parsed.country),
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
    country: sanitizeCountry(data.country),
  };
  localStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(safeDraft));
};

const validatePassword = (password: string) => {
  const hasMinLength = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;
  const strength = score <= 1 ? "Weak" : score === 2 ? "Medium" : "Strong";

  return {
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
    score,
    strength,
    isValid: hasMinLength && hasUppercase,
  };
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateDraft = ((location.state as any)?.signupDraft || {}) as SignupDraft;
  const [formData, setFormData] = useState(() => {
    const storedDraft = readSignupDraft() || {};
    return {
      name: String(stateDraft.name || storedDraft.name || ""),
      email: String(stateDraft.email || storedDraft.email || ""),
      password: "",
      organizationName: String(stateDraft.organizationName || storedDraft.organizationName || ""),
      country: sanitizeCountry(stateDraft.country || storedDraft.country || "Bolivia"),
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const passwordValidation = validatePassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      // Persist non-sensitive fields only. Password must never be stored.
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
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

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
        }
      });
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7f9] p-4 md:p-8 font-sans">
      <div className="w-full max-w-[560px] bg-white rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100">
        <div className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-3">
              <div style={{ backgroundColor: THEME_COLOR }} className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-100">
                <span className="text-white font-bold text-xl">TB</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 leading-none">Taban</span>
                <span style={{ color: THEME_COLOR }} className="text-base font-bold leading-none mt-1">Books</span>
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-8 tracking-tight">
              Let&apos;s get started<span style={{ color: THEME_COLOR }}>.</span>
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400 group-focus-within:text-[#156372] transition-colors" />
                </div>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156372]/20 focus:border-[#156372] transition-all bg-gray-50/30"
                  placeholder="Company Name"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#156372] transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156372]/20 focus:border-[#156372] transition-all bg-gray-50/30"
                  placeholder="Email address"
                />
              </div>

              <div className="relative group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#156372] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={9}
                    pattern="(?=.*[A-Z]).{9,}"
                    title="Password must be more than 8 characters and include at least one uppercase letter."
                    className="block w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156372]/20 focus:border-[#156372] transition-all bg-gray-50/30"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#156372] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 px-1">
                    <p className={`text-[11px] font-semibold ${passwordValidation.score >= 3 ? "text-emerald-600" : passwordValidation.score === 2 ? "text-amber-600" : "text-red-500"}`}>
                      Password strength: {passwordValidation.strength}
                    </p>
                    <p className="text-[11px] whitespace-nowrap overflow-x-auto">
                      <span className={passwordValidation.hasMinLength ? "text-emerald-600" : "text-gray-500"}>
                        More than 8 characters
                      </span>
                      <span className="text-gray-400"> | </span>
                      <span className={passwordValidation.hasUppercase ? "text-emerald-600" : "text-gray-500"}>
                        At least one uppercase letter
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400 group-focus-within:text-[#156372] transition-colors" />
                </div>
                <div className="relative">
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="block w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-xl text-gray-900 bg-gray-50/30 appearance-none focus:outline-none focus:ring-2 focus:ring-[#156372]/20 focus:border-[#156372] transition-all"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="py-2">
                <p className="text-[11px] text-gray-500 mb-3 ml-1 font-medium">Your data will be in US data center.</p>
                <label className="flex items-start gap-3 cursor-pointer group px-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setError("");
                    }}
                    className="mt-1 w-4 h-4 rounded-md border-gray-300 text-[#156372] focus:ring-[#156372] focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-gray-600 leading-normal">
                    I agree to the <span style={{ color: THEME_COLOR }} className="font-bold">Terms of Service</span> and <span style={{ color: THEME_COLOR }} className="font-bold">Privacy Policy</span>.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f6a821] hover:bg-[#e89c1d] text-white py-4 rounded-xl font-bold text-sm tracking-wider shadow-[0_10px_20px_rgba(246,168,33,0.3)] transition-all active:transform active:scale-[0.98] mt-2 h-[56px] flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "CREATE MY ACCOUNT"
                )}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">
                Already have an account?{" "}
                <Link to="/login" style={{ color: THEME_COLOR }} className="font-bold hover:underline transition-colors ml-1">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
