import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Organization from "../models/Organization.js";
import SenderEmail from "../models/SenderEmail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, "..", "..", ".env"),
];
for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  organizationId?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

export interface InvitationEmailOptions {
  name: string;
  email: string;
  password: string;
  role: string;
  organizationId: string;
  invitedBy?: string;
}

interface ResolvedSmtp {
  from: string;
  transport: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
}

interface ResolvedSmtpCandidate extends ResolvedSmtp {
  source: "relay" | "sender" | "env";
}

const toBool = (value: string | undefined): boolean => {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const fallbackSecure = (port: number, secure?: boolean): boolean =>
  typeof secure === "boolean" ? secure : port === 465;

const extractEmailAddress = (value?: string): string => {
  const source = String(value || "").trim();
  if (!source) return "";
  const angleMatch = source.match(/<([^>]+)>/);
  if (angleMatch?.[1]) return angleMatch[1].trim().toLowerCase();
  return source.toLowerCase();
};

const extractDomain = (email?: string): string => {
  const address = extractEmailAddress(email);
  if (!address.includes("@")) return "";
  return address.split("@")[1].trim().toLowerCase();
};

const relaySecureFromMode = (mode: string | undefined, port: number): boolean => {
  if (mode === "SSL") return true;
  if (mode === "Never") return false;
  return fallbackSecure(port);
};

const normalizeRelayPreference = (value: any): "domain" | "email" => {
  return value === "email" ? "email" : "domain";
};

async function resolveRelaySmtp(options: {
  organizationId?: string;
  from?: string;
}): Promise<ResolvedSmtp | null> {
  const { organizationId, from } = options;
  if (!organizationId) return null;

  const organization = await Organization.findById(organizationId).select("settings");
  const relaySettings: any = (organization as any)?.settings?.emailRelay || {};
  const relayServers = Array.isArray(relaySettings?.servers) ? relaySettings.servers : [];

  const enabledServers = relayServers.filter(
    (server: any) => server && server.isEnabled && server.serverName && server.port
  );
  if (!enabledServers.length) return null;

  const fromAddress = extractEmailAddress(from);
  const fromDomain = extractDomain(fromAddress);

  const pickServer = () => {
    if (fromAddress) {
      const emailMatch = enabledServers.find((server: any) => {
        const preference = normalizeRelayPreference(server.mailDeliveryPreference);
        const target = String(server.domainInServer || "").trim().toLowerCase();
        return preference === "email" && target === fromAddress;
      });
      if (emailMatch) return emailMatch;
    }

    if (fromDomain) {
      const domainMatch = enabledServers.find((server: any) => {
        const preference = normalizeRelayPreference(server.mailDeliveryPreference);
        const target = String(server.domainInServer || "").trim().toLowerCase();
        return preference === "domain" && target === fromDomain;
      });
      if (domainMatch) return domainMatch;
    }

    return enabledServers[0];
  };

  const selectedServer = pickServer();
  if (!selectedServer) return null;

  const host = String(selectedServer.serverName || "").trim();
  const port = Number(selectedServer.port || 0);
  if (!host || !port) return null;

  const authenticationRequired = Boolean(selectedServer.authenticationRequired);
  const username = String(selectedServer.username || "").trim();
  const password = String(selectedServer.password || "");
  if (authenticationRequired && (!username || !password)) {
    return null;
  }

  const relayFromAddress = fromAddress || username || process.env.SMTP_USER || "no-reply@tabanbooks.com";
  const appName = process.env.APP_NAME || "Taban Team";

  return {
    from: from || `"${appName}" <${relayFromAddress}>`,
    transport: {
      host,
      port,
      secure: relaySecureFromMode(selectedServer.useSecureConnection, port),
      ...(authenticationRequired
        ? {
            auth: {
              user: username,
              pass: password,
            },
          }
        : {}),
    },
  };
}

const appendOrganizationSignature = async (params: {
  organizationId?: string;
  html: string;
  text?: string;
}) => {
  const { organizationId, html, text } = params;
  if (!organizationId) {
    return {
      html,
      text: text || html.replace(/<[^>]*>/g, " "),
    };
  }

  try {
    const organization = await Organization.findById(organizationId).select(
      "settings.emailNotificationPreferences"
    );
    const signature = String(
      (organization as any)?.settings?.emailNotificationPreferences?.signature || ""
    ).trim();
    if (!signature) {
      return {
        html,
        text: text || html.replace(/<[^>]*>/g, " "),
      };
    }

    const normalizedSignature = signature.toLowerCase();
    const plainHtml = String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (plainHtml.includes(normalizedSignature)) {
      return {
        html,
        text: text || html.replace(/<[^>]*>/g, " "),
      };
    }

    const hasHtmlTags = /<([a-z][\s\S]*?)>/i.test(signature);
    const signatureHtml = hasHtmlTags
      ? signature
      : signature
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;")
          .replace(/\r\n/g, "\n")
          .replace(/\n/g, "<br/>");

    return {
      html: `${html}<br/><br/>${signatureHtml}`,
      text: `${text || html.replace(/<[^>]*>/g, " ")}\n\n${signature}`,
    };
  } catch {
    return {
      html,
      text: text || html.replace(/<[^>]*>/g, " "),
    };
  }
};

async function resolveSmtpCandidates(options: {
  organizationId?: string;
  from?: string;
}): Promise<ResolvedSmtpCandidate[]> {
  const { organizationId, from } = options;
  const candidates: ResolvedSmtpCandidate[] = [];
  const seen = new Set<string>();

  const appendCandidate = (candidate: ResolvedSmtp | null, source: ResolvedSmtpCandidate["source"]) => {
    if (!candidate) return;
    const key = [
      candidate.transport.host,
      candidate.transport.port,
      candidate.transport.secure ? "secure" : "insecure",
      candidate.transport.auth?.user || "",
      candidate.from,
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ ...candidate, source });
  };

  // 1) Organization relay SMTP (if enabled)
  const relaySmtp = await resolveRelaySmtp({ organizationId, from });
  appendCandidate(relaySmtp, "relay");

  // 2) Organization sender SMTP (primary sender)
  if (organizationId) {
    const sender = await SenderEmail.findOne({
      organization: organizationId,
      isPrimary: true,
    });

    if (sender) {
      const displayEmail = sender.email || sender.smtpUser;
      const senderFrom = from || `"${displayEmail}" <${displayEmail}>`;
      
      // Only use as SMTP candidate if it has credentials
      if (sender.smtpHost && sender.smtpUser && sender.smtpPassword && sender.smtpPort) {
        appendCandidate({
          from: senderFrom,
          transport: {
            host: sender.smtpHost,
            port: Number(sender.smtpPort),
            secure: fallbackSecure(Number(sender.smtpPort), sender.smtpSecure),
            auth: {
              user: sender.smtpUser,
              pass: sender.smtpPassword,
            },
          },
        }, "sender");
      }
    }
  }

  // 3) Environment SMTP fallback
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpSecure = toBool(process.env.SMTP_SECURE) || fallbackSecure(smtpPort);
    
    let displayEmail = smtpUser;
    
    // If we have an organization, try to use its primary sender email as the display email/from
    if (organizationId) {
      try {
        const primarySender = await SenderEmail.findOne({
          organization: organizationId,
          isPrimary: true,
        }).select('email');
        if (primarySender?.email) {
          displayEmail = primarySender.email;
        }
      } catch (err) {
        console.error("Error fetching primary sender for fallback:", err);
      }
    }

    const senderFrom = from || `"${displayEmail}" <${displayEmail}>` || process.env.SMTP_FROM;

    appendCandidate({
      from: senderFrom,
      transport: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      },
    }, "env");
  }

  return candidates;
}

/**
 * Test email connection using environment SMTP.
 */
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const smtpCandidates = await resolveSmtpCandidates({});
    if (!smtpCandidates.length) {
      console.error("Email connection test failed: SMTP is not configured.");
      return false;
    }
    const smtp = smtpCandidates[0];
    const transporter = nodemailer.createTransport(smtp.transport);
    await transporter.verify();
    console.log("Email server connection verified");
    return true;
  } catch (error: any) {
    console.error("Email connection failed:", error?.message || error);
    return false;
  }
};

/**
 * Send email with organization sender SMTP first, then .env fallback.
 */
export const sendEmail = async ({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  from,
  organizationId,
  attachments,
}: EmailOptions): Promise<{ success: boolean; messageId: string; logged?: boolean; error?: string }> => {
  try {
    const smtpCandidates = await resolveSmtpCandidates({ organizationId, from });
    if (!smtpCandidates.length) {
      return {
        success: false,
        messageId: "smtp-not-configured",
        error:
          "SMTP is not configured. Set sender SMTP in Settings or configure SMTP_USER and SMTP_PASS in server/.env.",
      };
    }

    const signedContent = await appendOrganizationSignature({
      organizationId,
      html,
      text,
    });

    let lastError: any = null;
    for (const smtp of smtpCandidates) {
      try {
        const transporter = nodemailer.createTransport(smtp.transport);
        const info = await transporter.sendMail({
          from: smtp.from,
          to,
          cc,
          bcc,
          subject,
          html: signedContent.html,
          text: signedContent.text,
          attachments: attachments || [],
        });

        return { success: true, messageId: info.messageId };
      } catch (error: any) {
        lastError = error;
        console.error(`Email send failed using ${smtp.source} SMTP:`, error?.message || error);
      }
    }

    return {
      success: false,
      messageId: "email-send-error",
      error: lastError?.message || "Failed to send email",
    };
  } catch (error: any) {
    console.error("Email send failed:", error?.message || error);
    return {
      success: false,
      messageId: "email-send-error",
      error: error?.message || "Failed to send email",
    };
  }
};

/**
 * Send staff invitation email (Gmail-friendly HTML).
 */
export const sendInvitationEmail = async (
  options: any
): Promise<{ success: boolean; messageId: string }> => {
  const { name, email, password, role, organizationId, invitedBy, customerName, inviteLink } = options;
  const recipientName = name || customerName || "there";


  let organizationName = process.env.APP_NAME || "Taban Books";
  try {
    const organization = await Organization.findById(organizationId).select("name");
    if (organization?.name) {
      organizationName = organization.name;
    }
  } catch {
    // keep fallback
  }

  const inviterName = invitedBy || "Taban Team";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
  const params = new URLSearchParams({
    name: recipientName,
    email: email || "",
    inviter: inviterName,
    org: organizationName,
    inviterEmail: process.env.SMTP_FROM || "support@taban.com"
  }).toString();

  const invitationPageUrl = inviteLink || `${frontendUrl}/accept-invitation?${params}`;
  const subject = `Invitation to join the ${organizationName} organization`;

  const appName = process.env.APP_NAME || "Taban Books";
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-size:30px;line-height:1.3;font-weight:600;color:#111827;">Invitation to join the ${organizationName} organization!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 20px 0;font-size:36px;line-height:1.2;font-weight:700;color:#111827;">Hi ${recipientName},</p>
              <p style="margin:0 0 14px 0;font-size:22px;line-height:1.5;color:#1f2937;">
                You have been invited by the admin of <strong>${organizationName}</strong> to join their ${appName} organization.
              </p>
              <p style="margin:0 0 14px 0;font-size:20px;line-height:1.5;color:#1f2937;">
                Assigned role: <strong>${role}</strong>
              </p>
              <p style="margin:0 0 24px 0;font-size:20px;line-height:1.5;color:#1f2937;">
                Invited by: <strong>${inviterName}</strong>
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:4px;background:#3b9c75;">
                    <a href="${invitationPageUrl}" style="display:inline-block;padding:14px 26px;font-size:24px;line-height:1;font-weight:700;color:#ffffff;text-decoration:none;">View Invitation</a>
                  </td>
                </tr>
              </table>

              <!-- removed login credentials section as requested -->


              <p style="margin:0 0 18px 0;font-size:16px;line-height:1.5;color:#374151;">
                If you have trouble accepting the invitation, contact your administrator.
              </p>
              <p style="margin:0 0 4px 0;font-size:16px;color:#374151;">Regards,</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">The Taban Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
                This email is generated by ${appName}. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    organizationId,
  });
};

export const sendReviewRequestEmail = async (
  options: any
): Promise<{ success: boolean; messageId: string }> => {
  const { customerName, customerEmail, invoiceNumber, organizationName, reviewLink } = options;
  const subject = `We'd love your feedback - ${organizationName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #156372; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">How was your experience?</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Hello ${customerName},</p>
          <p>Thank you for your recent purchase (Invoice: ${invoiceNumber}).</p>
          <p>We'd love to hear about your experience with ${organizationName}. Your feedback helps us improve our service.</p>
          <p style="text-align: center;">
            <a href="${reviewLink}" style="display: inline-block; padding: 12px 24px; background-color: #156372; color: white; text-decoration: none; border-radius: 4px;">Leave a Review</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html,
  });
};

export const sendReorderPointEmail = async (
  options: any
): Promise<{ success: boolean; messageId: string }> => {
  const organizationName = options.organizationName || "Your Organization";
  const recipients = Array.isArray(options.to)
    ? options.to.filter(Boolean)
    : options.recipientEmail
      ? [options.recipientEmail]
      : options.to
        ? [options.to]
        : [];

  const items = Array.isArray(options.items) && options.items.length > 0
    ? options.items
    : [{
        name: options.itemName || "Item",
        quantityLeft: options.currentStock ?? 0,
        reorderPoint: options.reorderPoint ?? 0,
        sku: options.sku || "",
      }];

  if (recipients.length === 0) {
    return {
      success: false,
      messageId: "missing-recipient",
    };
  }

  const subject = items.length === 1
    ? `Low Stock Alert: ${items[0].name} - ${organizationName}`
    : `Low Stock Alert: ${items.length} items - ${organizationName}`;

  const itemsHtml = items
    .map((item: any) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${item.name || "Item"}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.sku || "-"}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.quantityLeft ?? 0}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.reorderPoint ?? 0}</td>
      </tr>
    `)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Low Stock Alert</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>The following item(s) have reached or fallen below the reorder point in <strong>${organizationName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background: #ffffff; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Item</th>
                <th style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">SKU</th>
                <th style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Qty Left</th>
                <th style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">Reorder Point</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: recipients,
    subject,
    html,
    organizationId: options.organizationId,
  });
};

export default {
  testEmailConnection,
  sendEmail,
  sendInvitationEmail,
  sendReviewRequestEmail,
  sendReorderPointEmail,
};
