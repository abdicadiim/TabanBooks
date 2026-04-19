import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronRight, MoreHorizontal, CheckCircle2, Info } from "lucide-react";
import { login, checkUser, sendLoginOTP, verifyLoginOTP } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: OTP
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [userStatus, setUserStatus] = useState({ hasPassword: true, isInvited: false });

  // Handle incoming state from Accept Invitation
  useEffect(() => {
    if (location.state?.email && location.state?.step) {
      setFormData(prev => ({ ...prev, email: location.state.email }));
      setStep(location.state.step);
      if (location.state.step === 3) {
        setUserStatus({ hasPassword: false, isInvited: true });
        setTimer(60);
      }
    }
  }, [location.state]);

  useEffect(() => {
    let interval: any;
    if (step === 3 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    setLoading(true);
    setError("");

    try {
      const status = await checkUser(formData.email);
      setUserStatus(status);

      if (!status.hasPassword) {
        // Send OTP and move to step 3
        await sendLoginOTP(formData.email);
        setStep(3);
        setTimer(60);
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const authResponse = await login(formData.email, formData.password);
      const isVerified = authResponse?.organization?.isVerified === true;

      navigate(isVerified ? "/loading" : "/verify-identity");
    } catch (err: any) {
      let errorMessage = err.message || "Login failed. Please check your credentials.";
      if (errorMessage.includes('Backend server is not running') || errorMessage.includes('Cannot connect')) {
        errorMessage = "Cannot connect to backend server. Please ensure the server is running on port 5000.";
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
      await checkUser(formData.email);
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
      const isVerified = authResponse?.organization?.isVerified === true;

      navigate(isVerified ? "/loading" : "/verify-identity");
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    try {
      await sendLoginOTP(formData.email);
      setTimer(60);
    } catch (err: any) {
      setError("Failed to resend OTP.");
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return email;
    const maskedName = name.substring(0, 2) + "*".repeat(name.length - 2);
    const [domainName, domainExt] = domain.split(".");
    const maskedDomain = domainName.substring(0, 1) + "*".repeat(domainName.length - 1);
    return `${maskedName}@${maskedDomain}.${domainExt}`;
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans relative overflow-auto">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="flex-1 flex items-center justify-center p-4 z-10 text-sans">
        <div className="w-full max-w-[560px] bg-white rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100 min-h-[500px]">

          {/* Left Column: Form Section */}
          <div className="p-8 md:p-12 flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Header with Logo and Smart Sign-in */}
              <div className="flex justify-between items-start mb-10">
                <div className="flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    <div className="w-4 h-4 rounded-[1px] bg-[#fb4e4e] transform -rotate-3 translate-x-1"></div>
                    <div className="w-4 h-4 rounded-[1px] bg-[#00c652] transform rotate-3"></div>
                    <div className="w-4 h-4 rounded-[1px] bg-[#1a73e8] transform -rotate-6 -translate-y-1"></div>
                    <div className="w-4 h-4 rounded-[1px] bg-[#fbb000] rotate-12"></div>
                  </div>
                  <h1 className="text-[24px] font-bold text-[#1f2937] leading-tight">Sign in</h1>
                  <p className="text-[14px] text-gray-500 mt-0.5">to access Books</p>
                </div>
              </div>

              {/* Form Content */}
              {step === 3 && (
                <div className="mb-6 flex items-center gap-2.5 bg-[#e6fcf5] text-[#087f5b] px-4 py-3 rounded-[4px] border border-[#c3fae8] text-[13.5px] font-medium transition-all animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 size={16} className="text-[#099268] shrink-0" />
                  <span>OTP sent to {maskEmail(formData.email)}</span>
                  <button onClick={() => setStep(1)} className="ml-auto text-[#087f5b] hover:text-[#099268] transition-colors"><MoreHorizontal size={14} /></button>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-[13px] font-medium animate-shake">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleNext} className="space-y-6">
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Email address or mobile number"
                      className="w-full px-4 py-3 bg-[#f8f9fa] border border-gray-200 rounded focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-[#374151] text-[15px] placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#156372] hover:bg-[#0f4e5a] text-white py-3.5 rounded font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <span className="flex items-center gap-1.5">Next <ChevronRight size={16} /></span>
                    )}
                  </button>
                </form>
              ) : step === 2 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <span className="truncate flex-1 font-medium">{formData.email}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 font-bold text-xs hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                      autoFocus
                      className="w-full px-4 py-3 bg-[#f8f9fa] border border-gray-100 rounded focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-[#374151] text-[15px] placeholder-gray-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <button
                      type="button"
                      onClick={handleSignInWithOTP}
                      disabled={loading}
                      className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
                    >
                      Sign in using email OTP
                    </button>
                    <button
                      type="button"
                      onClick={handleSignInWithOTP}
                      disabled={loading}
                      className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1a83ff] hover:bg-[#0070f3] text-white py-3.5 rounded font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              ) : (
                /* OTP Step (Step 3) */
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <span className="truncate flex-1 font-medium">{formData.email}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 font-bold text-xs hover:underline transition-colors"
                    >
                      Change
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      required
                      placeholder="Enter OTP"
                      autoFocus
                      maxLength={6}
                      className="w-full px-4 py-3 bg-[#f8f9fa] border border-gray-100 rounded focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-[#374151] text-[16px] tracking-[0.2em] font-bold placeholder:tracking-normal placeholder:font-normal placeholder-gray-400"
                    />
                  </div>

                  <div className="flex justify-end pr-1">
                    <div className="w-full flex items-center justify-between">
                      {userStatus.hasPassword ? (
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[12px] text-blue-600 font-bold hover:underline"
                        >
                          Sign in using password
                        </button>
                      ) : (
                        <span />
                      )}
                      {timer > 0 ? (
                        <span className="text-[12px] text-gray-500 font-medium">Resend in {timer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          className="text-[12px] text-blue-600 font-bold hover:underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || formData.otp.length < 4}
                    className="w-full bg-[#1a83ff] hover:bg-[#0070f3] text-white py-3.5 rounded font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Verify"
                    )}
                  </button>

                  {!userStatus.hasPassword && (
                    <div className="bg-[#f0f7ff] border border-[#d0e6ff] rounded-[8px] p-4 flex gap-3.5 animate-in slide-in-from-bottom-2">
                      <div className="bg-[#1a83ff]/10 p-1.5 rounded-full h-fit mt-0.5">
                        <Info size={16} className="text-[#1a83ff]" />
                      </div>
                      <div className="text-[13px] leading-relaxed">
                        <p className="text-[#3b4b6b] font-medium">You have not set a password for this account</p>
                        <button type="button" className="text-[#1a83ff] font-bold hover:underline mt-0.5">Set password now.</button>
                      </div>
                    </div>
                  )}
                </form>
              )}

            </div>

            {/* Footer Link */}
            <div className="mt-8 text-[13px] text-gray-500">
              Don't have a Taban account?{" "}
              <Link to="/signup" className="text-blue-600 font-bold hover:underline transition-colors">
                Sign up now
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* External Footer */}
      <footer className="py-6 text-center text-gray-400 text-[12px] z-10">
        © 2026, Taban Corporation Pvt. Ltd. All Rights Reserved.
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />
    </div>
  );
}
