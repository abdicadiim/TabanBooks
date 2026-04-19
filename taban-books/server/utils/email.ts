import { sendEmail } from '../services/email.service.js';

/**
 * Send OTP Email
 */
export const sendOTPEmail = async (email: string, otp: string, organizationId?: string) => {
    const message = `Your verification code for Taban Books is: ${otp}. This code will expire in 10 minutes.`;

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f7f9; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e1e5e9;">
                <!-- Header -->
                <div style="padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: inline-flex; gap: 4px; margin-bottom: 10px;">
                        <div style="width: 24px; height: 24px; background-color: #ff4d4d; border-radius: 4px; display: inline-block;"></div>
                        <div style="width: 24px; height: 24px; background-color: #3385ff; border-radius: 4px; display: inline-block;"></div>
                        <div style="width: 24px; height: 24px; background-color: #2eb82e; border-radius: 4px; display: inline-block;"></div>
                        <div style="width: 24px; height: 24px; background-color: #ffbf00; border-radius: 4px; display: inline-block;"></div>
                    </div>
                    <div style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">TABAN</div>
                </div>

                <!-- Hero Section -->
                <div style="background-color: #0f4e5a; padding: 40px; text-align: center; color: #ffffff;">
                    <h2 style="font-size: 28px; font-weight: 700; margin: 0 0 10px 0; font-family: Georgia, serif;">Hello,</h2>
                    <h3 style="font-size: 18px; font-weight: 500; margin: 0 0 25px 0; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 25px; display: inline-block;">Thank you for signing up with us.</h3>
                    <p style="font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9); font-style: italic; max-width: 400px; margin: 0 auto;">
                        "We'd love for you to explore our software suite, and discover how our technology stack can help you meet your business needs."
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 40px; text-align: center;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px;">
                        <p style="font-size: 16px; color: #334155; margin-bottom: 25px; font-weight: 600;">
                            To get started, please confirm your Taban account <br />
                            <span style="color: #2563eb;">${email}</span>
                        </p>
                        
                        <div style="margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-identity" 
                                style="background-color: #1a9cfe; color: #ffffff; padding: 14px 40px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(26,156,254,0.3);">
                                Confirm Account
                            </a>
                        </div>

                        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 20px;">
                            <p style="font-size: 12px; color: #64748b; margin: 0;">Verification Code:</p>
                            <p style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 5px 0; letter-spacing: 4px;">${otp}</p>
                        </div>

                        <p style="font-size: 11px; color: #94a3b8; margin-top: 25px;">
                            This link and code will be valid for the next 10 minutes.
                        </p>
                    </div>

                    <div style="text-align: left; margin-top: 35px; border-top: 1px solid #f0f0f0; padding-top: 25px; color: #64748b; font-size: 13px; line-height: 1.6;">
                        <p>If you didn't perform this signup, you can <a href="#" style="color: #2563eb; text-decoration: none; font-weight: 600;">remove your email address</a>.</p>
                        <p>If you have any questions, reach out to us at <a href="mailto:support@tabancorp.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@tabancorp.com</a>.</p>
                        
                        <div style="margin-top: 25px;">
                            <p style="font-weight: 700; color: #1e293b; margin: 0;">Thank you,</p>
                            <p style="font-weight: 700; color: #0f4e5a; margin: 2px 0;">The Taban Team</p>
                            <a href="https://www.taban.com" style="color: #2563eb; text-decoration: none;">www.taban.com</a>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    <p style="margin: 0 0 10px 0;">Taban Corporation, 4141 Hacienda Dr, Pleasanton, CA 94588, USA.</p>
                    <p style="margin: 0;">Toll free: +1-888-900-9646 • Fax: +1-925-924-9600</p>
                </div>
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

