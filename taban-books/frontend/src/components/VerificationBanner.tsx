import React, { useState, useEffect } from "react";
import { ExternalLink, X, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";
import { getOrganization, logout } from "../services/auth";

export default function VerificationBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [isVerified, setIsVerified] = useState(() => {
        const flag = localStorage.getItem('account_verified') === 'true';
        if (flag) return true;
        const org = getOrganization();
        return org?.isVerified === true;
    });

    useEffect(() => {
        const handleVerified = () => {
            setIsVerified(true);
        };
        window.addEventListener('accountVerified', handleVerified);

        // Also check localStorage periodically or on focus if needed
        const checkStatus = () => {
            const flag = localStorage.getItem('account_verified') === 'true';
            if (flag) {
                setIsVerified(true);
            } else {
                const org = getOrganization();
                if (org?.isVerified) setIsVerified(true);
            }
        };

        window.addEventListener('focus', checkStatus);

        return () => {
            window.removeEventListener('accountVerified', handleVerified);
            window.removeEventListener('focus', checkStatus);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    if (isVerified) return null;

    return (
        <>
            {/* Blocking Overlay */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9998] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#0f4e5a] p-8 text-center text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <ShieldAlert size={32} className="text-orange-300" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Account Verification Required</h2>
                        <p className="text-teal-50/80 text-sm leading-relaxed">
                            To protect your data and enable all features, please verify your account.
                        </p>
                    </div>

                    <div className="p-8 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0"></div>
                            <p className="text-[13px] text-orange-800 font-medium">
                                We've sent a verification link to your email.
                            </p>
                        </div>

                        <button
                            className="w-full bg-[#1a9cfe] hover:bg-[#0088eb] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            onClick={() => {
                                window.location.href = '/verify-identity';
                            }}
                        >
                            <CheckCircle2 size={18} />
                            Verify Account Now
                        </button>

                        <button
                            className="w-full bg-white hover:bg-gray-50 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Banner (Optional, keep for visual consistency if overlay ever fails or for short transitions) */}
            <div className="bg-orange-500 text-white py-1.5 px-4 text-center text-[12px] font-bold z-[9999] relative">
                Verification Required: Please check your email to verify your Taban account.
            </div>
        </>
    );
}
