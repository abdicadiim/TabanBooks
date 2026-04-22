import { sendEmail } from '../services/email.service.js';

/**
 * Send OTP Email
 */
export const sendOTPEmail = async (email: string, otp: string, organizationId?: string) => {
    const message = `Your verification code for Taban Books is: ${otp}. This code will expire in 10 minutes.`;

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 40px auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; text-align: center;">
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 40px; margin-bottom: 30px;">
                <p style="font-size: 16px; color: #334155; margin-bottom: 25px; font-weight: 600;">
                    To get started, please confirm your Taban account <br />
                    <span style="color: #2563eb;">${email}</span>
                </p>

                <div style="background-color: #156372; padding: 30px; border-radius: 12px; margin-top: 25px; box-shadow: 0 4px 10px rgba(21, 99, 114, 0.15);">
                    <p style="font-size: 11px; color: rgba(255, 255, 255, 0.7); margin: 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Verification Code</p>
                    <p style="font-size: 32px; font-weight: 800; color: #ffffff; margin: 10px 0 0; letter-spacing: 8px;">${otp}</p>
                </div>

                <p style="font-size: 11px; color: #94a3b8; margin-top: 25px;">
                    This link and code will be valid for the next 10 minutes.
                </p>
            </div>

            <div style="text-align: left; padding: 0 10px; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                <p style="font-weight: 700; color: #1e293b; margin: 0;">Thank you,</p>
                <p style="font-weight: 700; color: #0f4e5a; margin: 2px 0;">The Taban Team</p>
                <a href="https://www.taban.com" style="color: #2563eb; text-decoration: none;">www.taban.com</a>
            </div>
        </div>
    `;

    const result = await sendEmail({
        to: email,
        subject: 'Verify your Taban account',
        html,
        text: message,
        organizationId
    });

    if (!result.success) {
        console.error("Failed to send OTP email:", {
            email,
            organizationId,
            error: result.error || "unknown-error",
        });
    }

    return result.success;
};
