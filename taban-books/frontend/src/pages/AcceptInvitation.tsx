import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, ShieldCheck, CheckCircle2, AlertCircle, X, ChevronRight, Lock, ReceiptText } from "lucide-react";
import { sendLoginOTP, verifyLoginOTP } from "../services/auth";
import { senderEmailsAPI } from "../services/api";

export default function AcceptInvitation() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [invitationData, setInvitationData] = useState({
        name: "",
        email: "",
        inviter: "",
        org: "",
        inviterEmail: "",
        type: "", // 'sender' or 'user'
        senderId: ""
    });

    const [step, setStep] = useState(1); // 1: Invite, 2: OTP
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const name = searchParams.get("name") || "User";
        const email = searchParams.get("email") || "";
        const inviter = searchParams.get("inviter") || "Admin";
        const org = searchParams.get("org") || "Organization";
        const inviterEmail = searchParams.get("inviterEmail") || "admin@example.com";
        const type = searchParams.get("type") || "user";
        const senderId = searchParams.get("senderId") || "";

        setInvitationData({ name, email, inviter, org, inviterEmail, type, senderId });
    }, [searchParams]);

    const isSenderMode = invitationData.type === "sender";

    const handleAcceptClick = async () => {
        if (!invitationData.email) return;
        setIsLoading(true);
        setError(null);
        try {
            await sendLoginOTP(invitationData.email);
            setStep(2);
        } catch (error: any) {
            setError(error.message || "Failed to send verification code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim().slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = [...otp];
        data.split("").forEach((digit, index) => {
            if (index < 6) newOtp[index] = digit;
        });
        setOtp(newOtp);

        // Focus the last filled input or the next empty one
        const focusIndex = data.length === 6 ? 5 : data.length;
        otpRefs.current[focusIndex]?.focus();
    };

    const handleVerifyOtp = async () => {
        const fullOtp = otp.join("");
        if (fullOtp.length < 6) return;

        setIsLoading(true);
        setError(null);
        try {
            // Verify the OTP (logs the user in if needed)
            await verifyLoginOTP(invitationData.email, fullOtp);
            
            // If it's a sender verification flow, we need to mark the sender as verified
            if (isSenderMode && invitationData.senderId) {
                await senderEmailsAPI.update(invitationData.senderId, { 
                    isVerified: true
                });
            }

            navigate("/");
        } catch (error: any) {
            setError(error.message || "Invalid verification code.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Decorative Elements - Silver/Metallic theme */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-300/40 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#156372]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(30,41,59,0.08)] border border-slate-200 overflow-hidden z-10 transition-all duration-500">
                {step === 1 ? (
                    <div className="p-10">
                        <div className="flex justify-between items-center mb-10">
                            <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                <div className="text-[28px] font-bold text-[#156372]">
                                    {isSenderMode ? <Lock size={32} /> : (invitationData.org ? invitationData.org.charAt(0).toUpperCase() : "O")}
                                </div>
                            </div>
                            <div className="h-10 px-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                                <ShieldCheck size={16} />
                                {isSenderMode ? "Sender Verification" : "Official Invitation"}
                            </div>
                        </div>

                        <div className="mb-10 text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {isSenderMode ? "Verify Sender Email" : `Join ${invitationData.org}`}
                            </h2>
                            <p className="text-slate-600 text-[15px] leading-relaxed">
                                {isSenderMode 
                                    ? `Please verify that you own ${invitationData.email} before it can be used for all organization communications and official documents.`
                                    : `You have been invited by ${invitationData.inviter} to collaborate on Taban Books.`}
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 mb-10 border border-slate-200/50">
                            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                                <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                                        {isSenderMode ? "SYSTEM SENDER ADDRESS" : "INVITATION SENT TO"}
                                    </div>
                                    <div className="text-sm font-bold text-slate-800">{invitationData.email}</div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed italic">
                                {isSenderMode 
                                    ? "By verifying, this address will handle all system-wide communications including invoices, receipts, and automated notifications."
                                    : "By accepting, you'll gain access to the financial registers and tools of this organization."}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleAcceptClick}
                                disabled={isLoading}
                                className="flex-[2] bg-[#156372] hover:bg-[#0f4e5a] text-white h-14 rounded-xl font-bold text-base transition-all shadow-[0_4px_15px_rgba(21,99,114,0.2)] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>{isSenderMode ? "Verify Now" : "Accept Invitation"} <ChevronRight size={18} /></>
                                )}
                            </button>
                            <button
                                onClick={() => navigate("/login")}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 h-14 rounded-xl border border-slate-200 font-semibold text-base transition-all active:scale-[0.98]"
                            >
                                {isSenderMode ? "Cancel" : "Reject"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-10">
                        <button 
                            onClick={() => setStep(1)}
                            className="absolute right-6 top-6 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 shadow-sm">
                                <Lock size={28} className="text-[#156372]" />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify your identity</h2>
                            <p className="text-slate-600 text-[15px] max-w-[320px] mb-10">
                                We've sent a 6-digit verification code to <span className="font-bold text-slate-900">{invitationData.email}</span>. Please enter it below.
                            </p>

                            <div className="flex gap-2 max-w-[360px] mb-10" onPaste={handlePaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-[52px] h-16 text-center text-2xl font-extrabold rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-[#156372] focus:bg-white focus:outline-none transition-all text-slate-800"
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="w-full mb-8 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm text-left">
                                    <AlertCircle size={18} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otp.some(d => !d)}
                                className="w-full bg-[#156372] hover:bg-[#0f4e5a] text-white h-14 rounded-xl font-bold text-base transition-all shadow-[0_4px_15px_rgba(21,99,114,0.2)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>Complete Verification <CheckCircle2 size={18} /></>
                                )}
                            </button>

                            <button 
                                onClick={handleAcceptClick}
                                disabled={isLoading}
                                className="mt-8 text-sm font-bold text-[#156372] hover:underline flex items-center gap-2"
                            >
                                Resend code
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
