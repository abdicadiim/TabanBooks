import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { getCurrentUser, resendOTP, verifyAccount } from "../services/auth";
import toast from "react-hot-toast";

export default function VerifyIdentity() {
    const navigate = useNavigate();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(0);

    const otpRefs = [
        React.useRef<HTMLInputElement>(null),
        React.useRef<HTMLInputElement>(null),
        React.useRef<HTMLInputElement>(null),
        React.useRef<HTMLInputElement>(null),
        React.useRef<HTMLInputElement>(null),
        React.useRef<HTMLInputElement>(null),
    ];

    useEffect(() => {
        const user = getCurrentUser();
        if (user && user.email) {
            setUserEmail(user.email);
        }
    }, []);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const maskEmail = (email: string) => {
        if (!email) return "user@example.com";
        const [name, domain] = email.split("@");
        if (!name || !domain) return email;
        const maskedName = name.length > 2 ? name.substring(0, 2) + "*".repeat(name.length - 2) : name;
        if (!domain.includes(".")) return `${maskedName}@${domain}`;
        const [domainPrefix, domainSuffix] = domain.split(".");
        const maskedDomain = domainPrefix.length > 2 ? domainPrefix.substring(0, 2) + "*".repeat(domainPrefix.length - 2) : domainPrefix;
        return `${maskedName}@${maskedDomain}.${domainSuffix || "com"}`;
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        pastedData.split("").forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);

        const nextIndex = Math.min(pastedData.length, 5);
        otpRefs[nextIndex].current?.focus();
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await resendOTP();
            toast.success("Verification code resent!");
            setTimer(60);
        } catch (error) {
            toast.error("Failed to resend code");
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join("");
        if (otpCode.length !== 6) return;

        setLoading(true);
        try {
            await verifyAccount(otpCode);
            window.dispatchEvent(new CustomEvent('accountVerified', { detail: { verified: true } }));
            toast.success("Account verified successfully!");
            navigate("/");
        } catch (error: any) {
            console.error("Verification failed", error);
            const message = String(error?.message || "").toLowerCase();
            if (message.includes("invalid") || message.includes("incorrect") || message.includes("otp") || message.includes("verification")) {
                toast.error("Incorrect verification code");
            } else {
                toast.error(error?.message || "Incorrect verification code");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M0 100 L50 0 L100 100 Z' fill='none' stroke='%23e2e8f0' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: '400px 400px'
                }}></div>

            <div className="w-full max-w-[460px] bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 p-12 z-10 relative">
                <div className="flex flex-col items-center mb-10">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1.5 mb-2 scale-110">
                            <div className="w-6 h-6 rounded-[5px] border-[2.5px] border-[#ea4335] transform rotate-[-8deg] shadow-sm"></div>
                            <div className="w-6 h-6 rounded-[5px] border-[2.5px] border-[#4285f4] transform rotate-[12deg] -ml-2 shadow-sm"></div>
                            <div className="w-6 h-6 rounded-[5px] border-[2.5px] border-[#34a853] transform rotate-[-6deg] -ml-2 shadow-sm"></div>
                            <div className="w-6 h-6 rounded-[5px] border-[2.5px] border-[#fbbc05] transform rotate-[10deg] -ml-2 shadow-sm"></div>
                        </div>
                        <span className="text-[11px] font-black tracking-[0.4em] text-gray-400 uppercase">TABAN</span>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-lg text-sm text-gray-600 mb-8 w-full justify-between">
                        <span className="font-medium truncate">{maskEmail(userEmail)}</span>
                        <button type="button" className="text-blue-500 font-bold hover:underline text-[13px] flex-shrink-0" onClick={() => navigate('/login')}>Not you?</button>
                    </div>

                    <h1 className="text-[26px] font-bold text-gray-900 mb-4 tracking-tight">Verify your identity</h1>
                    <p className="text-gray-500 text-[15px] leading-relaxed px-2">
                        We've sent a 6-digit verification code to your email. Please enter it below to proceed.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="flex justify-between gap-2" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={otpRefs[index]}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-[54px] h-[64px] text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            disabled={resending || timer > 0}
                            onClick={handleResend}
                            className="text-blue-500 text-[14px] font-bold hover:underline disabled:text-gray-400 disabled:no-underline"
                        >
                            {timer > 0 ? `Resend code in ${timer}s` : "Resend Verification Code"}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.join("").length !== 6}
                        className="w-full h-[54px] bg-[#1a9cfe] hover:bg-[#008ef5] disabled:bg-blue-300 text-white font-bold text-lg rounded-lg shadow-[0_10px_20px_rgba(26,156,254,0.2)] transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : "Verify Account"}
                    </button>
                </form>
            </div>
        </div>
    );
}
