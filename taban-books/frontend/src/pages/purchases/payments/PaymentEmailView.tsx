import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    X,
    Paperclip,
    HelpCircle,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    FileText,
    ChevronDown
} from "lucide-react";
import { emailTemplatesAPI, paymentsMadeAPI, settingsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import { applyEmailTemplate } from "../../settings/emailTemplateUtils";

export default function PaymentEmailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [payment, setPayment] = useState<any>(null);
    const [organizationInfo, setOrganizationInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [emailData, setEmailData] = useState({
        from: "",
        sendTo: "",
        subject: "Payment has been made for your invoice(s)",
        body: "",
    });

    const [attachments, setAttachments] = useState<any[]>([]);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [fontSize, setFontSize] = useState("16");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [paymentRes, orgRes] = await Promise.all([
                    paymentsMadeAPI.getById(id!),
                    settingsAPI.getOrganizationProfile()
                ]);

                const paymentData = paymentRes.data || paymentRes;
                const orgData = orgRes.data || orgRes;

                setPayment(paymentData);
                setOrganizationInfo(orgData);

                // Extract vendor email from populated vendor object
                const vendorEmail = paymentData.vendor?.email || paymentData.vendor?.primaryContact?.email || "";
                let templateSubject = "Payment has been made for your invoice(s)";
                let templateBody = "";

                try {
                    const templateRes = await emailTemplatesAPI.getByKey("payment_made_notification");
                    const template = templateRes?.data;
                    if (template) {
                        const placeholders = {
                            VendorName: paymentData.vendorName || paymentData.vendor?.displayName || "Vendor",
                            CompanyName: orgData.companyName || orgData.name || "",
                            SenderName: orgData.companyName || orgData.name || "",
                        };
                        templateSubject = applyEmailTemplate(template.subject || templateSubject, placeholders);
                        templateBody = applyEmailTemplate(template.emailBody || template.body || templateBody, placeholders);
                    }
                } catch (templateError) {
                    console.error("Error loading payment made template:", templateError);
                }

                setEmailData(prev => ({
                    ...prev,
                    from: `${orgData.companyName || orgData.name} <${orgData.email || "noreply@example.com"}>`,
                    sendTo: vendorEmail,
                    subject: templateSubject,
                    body: templateBody || prev.body,
                }));
            } catch (error) {
                console.error("Error loading email data:", error);
                toast.error("Failed to load payment data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSend = async () => {
        if (!emailData.sendTo) {
            toast.error("Please enter a recipient email address");
            return;
        }

        try {
            await paymentsMadeAPI.sendEmail(id!, {
                to: emailData.sendTo,
                subject: emailData.subject,
                body: emailData.body
            });
            toast.success("Email sent successfully!");
            navigate(`/purchases/payments-made/${id}`);
        } catch (error: any) {
            console.error("Error sending email:", error);
            toast.error(error.message || "Failed to send email");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const styles = {
        container: {
            backgroundColor: "#ffffff",
            minHeight: "100vh",
            padding: "24px 48px",
            fontFamily: "'Inter', sans-serif",
        },
        header: {
            fontSize: "20px",
            fontWeight: "500",
            color: "#111827",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e7eb",
        },
        formSection: {
            maxWidth: "1000px",
            margin: "0 auto",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            overflow: "hidden",
        },
        fieldRow: {
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
        },
        fieldLabel: {
            width: "80px",
            fontSize: "13px",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "4px",
        },
        fieldInput: {
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "14px",
            color: "#111827",
            padding: "4px 8px",
        },
        toolbar: {
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "8px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
        },
        toolbarBtn: {
            padding: "6px",
            borderRadius: "4px",
            color: "#4b5563",
            cursor: "pointer",
            border: "none",
            backgroundColor: "transparent",
        },
        editor: {
            padding: "24px",
            minHeight: "400px",
            overflowY: "auto" as const,
            backgroundColor: "#f3f4f6",
        },
        emailContent: {
            backgroundColor: "#ffffff",
            padding: "40px",
            maxWidth: "800px",
            margin: "0 auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            minHeight: "600px",
        },
        blueBanner: {
            backgroundColor: "#156372",
            color: "#ffffff",
            padding: "40px",
            textAlign: "center" as const,
            fontSize: "24px",
            fontWeight: "500",
            marginBottom: "40px",
        },
        summaryBox: {
            backgroundColor: "#fffdf0",
            border: "1px solid #fef3c7",
            padding: "40px",
            textAlign: "center" as const,
            marginBottom: "40px",
        },
        summaryTitle: {
            fontSize: "18px",
            color: "#111827",
            marginBottom: "16px",
        },
        summaryAmount: {
            fontSize: "32px",
            fontWeight: "700",
            color: "#10b981",
        },
        attachmentBar: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderTop: "1px solid #e5e7eb",
        },
        footer: {
            display: "flex",
            gap: "12px",
            marginTop: "24px",
            maxWidth: "1000px",
            margin: "24px auto 0",
        },
        sendBtn: {
            backgroundColor: "#156372",
            color: "#ffffff",
            padding: "8px 24px",
            borderRadius: "4px",
            fontWeight: "600",
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
        },
        cancelBtn: {
            backgroundColor: "#ffffff",
            color: "#374151",
            padding: "8px 24px",
            borderRadius: "4px",
            fontWeight: "500",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            cursor: "pointer",
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>Email To {payment?.vendorName || "Vendor"}</div>

            <div style={styles.formSection}>
                <div style={styles.fieldRow}>
                    <div style={styles.fieldLabel}>From <HelpCircle size={14} /></div>
                    <input style={styles.fieldInput} readOnly value={emailData.from} />
                </div>
                <div style={styles.fieldRow}>
                    <div style={styles.fieldLabel}>Send To</div>
                    <input
                        style={styles.fieldInput}
                        value={emailData.sendTo}
                        onChange={e => setEmailData({ ...emailData, sendTo: e.target.value })}
                    />
                    <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "#156372" }}>
                        <span className="cursor-pointer">Cc</span>
                        <span className="cursor-pointer">Bcc</span>
                    </div>
                </div>
                <div style={styles.fieldRow}>
                    <div style={styles.fieldLabel}>Subject</div>
                    <input
                        style={styles.fieldInput}
                        value={emailData.subject}
                        onChange={e => setEmailData({ ...emailData, subject: e.target.value })}
                    />
                </div>

                <div style={styles.toolbar}>
                    <button style={styles.toolbarBtn}><Bold size={16} /></button>
                    <button style={styles.toolbarBtn}><Italic size={16} /></button>
                    <button style={styles.toolbarBtn}><Underline size={16} /></button>
                    <button style={styles.toolbarBtn}><Strikethrough size={16} /></button>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 8px", borderRight: "1px solid #e5e7eb", fontSize: "13px" }}>
                        16 px <ChevronDown size={14} />
                    </div>
                    <button style={styles.toolbarBtn}><List size={16} /></button>
                    <button style={styles.toolbarBtn}><ListOrdered size={16} /></button>
                    <button style={styles.toolbarBtn}><AlignLeft size={16} /></button>
                    <button style={styles.toolbarBtn}><LinkIcon size={16} /></button>
                    <button style={styles.toolbarBtn}><ImageIcon size={16} /></button>
                </div>

                <div style={styles.editor}>
                    <div style={styles.emailContent}>
                        {/* Template Header */}
                        <div style={styles.blueBanner}>
                            Payment Made
                        </div>

                        {/* Greeting */}
                        <div style={{ textAlign: "center", marginBottom: "32px", color: "#4b5563" }}>
                            Hi {payment?.vendorName || "Vendor"},
                        </div>

                        <div style={{ textAlign: "center", marginBottom: "32px", color: "#4b5563" }}>
                            We have made the payment for your invoice(s). It's been a pleasure doing business
                        </div>

                        {/* Amount Box */}
                        <div style={styles.summaryBox}>
                            <div style={styles.summaryTitle}>Payment Made</div>
                            <div style={styles.summaryAmount}>
                                AED {parseFloat(payment?.amount || 0).toFixed(2)}
                            </div>
                        </div>

                        {/* Footer details */}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280", fontSize: "14px" }}>
                            <div>
                                Invoice Number <span style={{ fontWeight: "600", color: "#111827" }}>{payment?.billNumber || "---"}</span>
                            </div>
                            <div>
                                Payment Date <span style={{ fontWeight: "600", color: "#111827" }}>{new Date(payment?.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: "64px", color: "#6b7280" }}>
                            Regards,<br />
                            <span style={{ color: "#4b5563" }}>{organizationInfo?.companyName || organizationInfo?.name}</span><br />
                            <div style={{ marginTop: "8px", fontSize: "12px" }}>{organizationInfo?.companyName || "d"}</div>
                        </div>
                    </div>
                </div>

                <div style={styles.attachmentBar}>
                    <div style={{ padding: "4px 8px", border: "1px dashed #d1d5db", borderRadius: "4px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b7280" }}>
                        <FileText size={16} color="#156372" /> Payment-{id?.slice(-1) || "1"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#156372", fontSize: "13px", cursor: "pointer" }}>
                        <Paperclip size={16} /> Attachments
                    </div>
                </div>
            </div>

            <div style={styles.footer}>
                <button style={styles.sendBtn} onClick={handleSend}>Send</button>
                <button style={styles.cancelBtn} onClick={() => navigate(`/purchases/payments-made/${id}`)}>Cancel</button>
            </div>
        </div>
    );
}
