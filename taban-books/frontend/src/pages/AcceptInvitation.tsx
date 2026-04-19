import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, ShieldCheck } from "lucide-react";
import { sendLoginOTP } from "../services/auth";

export default function AcceptInvitation() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [invitationData, setInvitationData] = useState({
        name: "",
        email: "",
        inviter: "",
        org: "d",
        inviterEmail: ""
    });

    useEffect(() => {
        // Extract data from query params for better demonstration
        const name = searchParams.get("name") || "User";
        const email = searchParams.get("email") || "";
        const inviter = searchParams.get("inviter") || "Admin";
        const org = searchParams.get("org") || "d";
        const inviterEmail = searchParams.get("inviterEmail") || "admin@example.com";

        setInvitationData({ name, email, inviter, org, inviterEmail });
    }, [searchParams]);

    const [isLoading, setIsLoading] = useState(false);

    const handleAccept = async () => {
        if (!invitationData.email) return;

        setIsLoading(true);
        try {
            // Send OTP directly from here
            await sendLoginOTP(invitationData.email);
            // Redirect to login page at Step 3 (OTP)
            navigate("/login", {
                state: {
                    email: invitationData.email,
                    step: 3
                }
            });
        } catch (error: any) {
            alert(error.message || "Failed to initiate acceptance. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = () => {
        // Just a placeholder for reject
        alert("Invitation rejected");
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 font-sans">
            {/* Logos section - Using stylized Taban Books-like boxes for Tablet Books/Books */}
            <div className="flex flex-col items-center mb-8">
                <div className="flex gap-1 mb-2">
                    <div className="w-5 h-5 rounded-[4px] border-2 border-[#fb4e4e] transform -rotate-6"></div>
                    <div className="w-5 h-5 rounded-[4px] border-2 border-[#00c652] transform rotate-3"></div>
                    <div className="w-5 h-5 rounded-[4px] border-2 border-[#1a73e8] transform -rotate-3"></div>
                    <div className="w-5 h-5 rounded-[4px] border-2 border-[#fbb000] rotate-6"></div>
                </div>
                <span className="text-[12px] font-bold text-gray-400 tracking-[0.2em] uppercase">TABAN BOOKS</span>
            </div>

            <div className="w-full max-w-[580px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-10">
                    {/* Header row with Avatar and Books logo */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-20 h-20 rounded-full bg-[#f0f7ff] flex items-center justify-center border border-[#e0f0ff] shadow-sm">
                            <div className="text-[32px] font-semibold text-[#0066ff]">
                                {invitationData.name ? invitationData.name.charAt(0).toUpperCase() : "U"}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#374151]">
                            <div className="bg-[#1a83ff] p-1.5 rounded text-white">
                                <ShieldCheck size={18} />
                            </div>
                            <span className="font-bold text-[18px]">Books</span>
                        </div>
                    </div>

                    {/* Invitation Details */}
                    <div className="mb-10">
                        <h2 className="text-[20px] font-bold text-gray-900 mb-1">{invitationData.org}</h2>
                        <div className="text-[15px] text-gray-500">
                            Invited by {invitationData.inviter} <span className="text-blue-500">({invitationData.inviterEmail})</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 my-8"></div>

                    <div className="space-y-6">
                        <h3 className="text-[22px] font-bold text-gray-900">Join Our Organization</h3>
                        <p className="text-[16px] text-gray-600 leading-relaxed">
                            We invite you to join Books of our organization <span className="font-bold text-gray-900">{invitationData.org}</span>. Sign in to your Taban Books account associated with the email address <span className="font-bold text-gray-900">{invitationData.email}</span> to view the invitation.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={handleAccept}
                                disabled={isLoading}
                                className="flex-1 bg-[#1a83ff] hover:bg-[#0070f3] text-white py-3.5 px-6 rounded-md font-bold text-[15px] transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    "Accept"
                                )}
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 bg-white hover:bg-gray-50 text-gray-600 py-3.5 px-6 rounded-md border border-gray-300 font-bold text-[15px] transition-all active:scale-[0.98]"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-[14px] text-gray-500">
                    Please contact <span className="text-blue-500">{invitationData.inviterEmail}</span> for any queries.
                </p>
            </div>
        </div>
    );
}

