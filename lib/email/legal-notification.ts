/**
 * Legal Update Notification Email Builder & Sender
 *
 * Dispatches a beautifully crafted announcement letter inspired by Google Payments:
 * - Direct, professional opening ("We're updating our terms of service")
 * - Bolds the core update and effective date milestone
 * - "No action required / no impact" reassurance paragraph
 * - Clean list of current legal agreements
 * - "Sincerely, Gaurav Patil" sign-off
 * - Google-style Help Center and Contact Us footer links
 * - Zero internal logs, zero version numbers (e.g. 0.0.2)
 * - Sourced strictly from no-reply@gauravpatil.online with no-reply routing
 */

import { EMAIL_IDENTITIES } from "./identities";
import { sendTransactionalEmail, SendEmailResult, escapeHtml, resolveAppUrl } from "./brevo";
import { formatLegalSummaryProse } from "@/lib/legal/prose";

export interface BuildLegalNotificationParams {
  docType: "TERMS" | "PRIVACY";
  version: string;
  effectiveDate: string;
  changeSummary: string;
  recipientName?: string;
  recipientType?: "VISITOR" | "ADMIN_AUDIT";
}

export { formatLegalSummaryProse };

export function buildLegalNotificationEmail(params: BuildLegalNotificationParams): {
  subject: string;
  htmlContent: string;
  textContent: string;
} {
  const docTitle = params.docType === "TERMS" ? "Terms of Service" : "Privacy Policy";
  const appBaseUrl = resolveAppUrl();
  const termsUrl = `${appBaseUrl}/terms`;
  const privacyUrl = `${appBaseUrl}/privacy`;
  const contactUrl = `${appBaseUrl}/contact`;
  const policyUrl = params.docType === "TERMS" ? termsUrl : privacyUrl;

  // Google Payments style subject line & headline
  const subject =
    params.docType === "TERMS"
      ? "Updating our terms of service"
      : "Updating our privacy policy";

  const headlineTitle =
    params.docType === "TERMS"
      ? "We're updating our terms of service"
      : "We're updating our privacy policy";

  const recipientName = params.recipientName?.trim();
  const greeting =
    recipientName && recipientName !== "Visitor"
      ? `Dear ${recipientName},`
      : "Dear Customer,";

  const safeEffectiveDate = escapeHtml(params.effectiveDate);
  const prose = formatLegalSummaryProse(docTitle, safeEffectiveDate);

  const textContent = `
${headlineTitle}

${greeting}

You're receiving this email as per policy and acceptance of use, because you may have used my services, accessed authenticated services, or interacted with Gaurav Portfolio.

${prose.text}

Your current legal agreements:
• Terms of Service: ${termsUrl}
• Privacy Policy: ${privacyUrl}

Review updated ${docTitle.toLowerCase()}:
${policyUrl}

Sincerely,
Gaurav Patil
Gaurav Portfolio

-------------------------------------------------------------------------------
Help center: ${termsUrl}#legal-contact
Contact us: ${contactUrl}

You have received this mandatory service announcement to update you about important changes to Gaurav Portfolio.
Please do not reply to this email, as replies to this automated address are not monitored.
`.trim();

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#ffffff;font-family:'Google Sans',Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#202124;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:580px;margin:0 auto;">
    <tr>
      <td style="padding:0;font-family:'Google Sans',Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        
        <!-- Google-Style Header Logo -->
        <div style="margin-bottom:16px;">
          <span style="font-size:24px;font-weight:600;color:#1a73e8;letter-spacing:-0.5px;">Gaurav</span>
          <span style="font-size:24px;font-weight:400;color:#5f6368;letter-spacing:-0.5px;"> Portfolio</span>
        </div>

        <!-- Google-Style Top Divider -->
        <hr style="border:none;border-top:1px solid #dadce0;margin:0 0 24px 0;" />

        <!-- Google-Style Primary Headline -->
        <h1 style="margin:0 0 20px 0;font-size:26px;font-weight:400;color:#1a73e8;line-height:1.25;letter-spacing:-0.2px;">
          ${escapeHtml(headlineTitle)}
        </h1>

        <!-- Greeting -->
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#202124;">
          ${escapeHtml(greeting)}
        </p>

        <!-- Context Sentence -->
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#3c4043;">
          You're receiving this email as per policy and acceptance of use, because you may have used my services, accessed authenticated services, or interacted with Gaurav Portfolio.
        </p>

        <!-- Core Update Prose + Reassurance -->
        ${prose.html}

        <!-- Current Agreements List -->
        <p style="margin:20px 0 8px 0;font-size:14px;font-weight:700;color:#202124;">
          Your current legal agreements:
        </p>
        <ul style="margin:0 0 22px 0;padding-left:20px;font-size:14px;line-height:1.8;color:#1a73e8;">
          <li style="margin-bottom:4px;">
            <a href="${termsUrl}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:underline;">Terms of Service</a>
          </li>
          <li style="margin-bottom:4px;">
            <a href="${privacyUrl}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:underline;">Privacy Policy</a>
          </li>
        </ul>

        <!-- Google-Style Action CTA Button -->
        <div style="margin:22px 0 28px 0;">
          <a href="${policyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1a73e8;color:#ffffff;font-size:14px;font-weight:500;padding:10px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.01em;">
            Review updated ${escapeHtml(docTitle.toLowerCase())}
          </a>
        </div>

        <!-- Google-Style Sign-Off -->
        <div style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#3c4043;">
          Sincerely,<br />
          <strong style="color:#202124;">Gaurav Patil</strong><br />
          <span style="color:#5f6368;">Gaurav Portfolio</span>
        </div>

        <!-- Google-Style Bottom Divider -->
        <hr style="border:none;border-top:1px solid #dadce0;margin:32px 0 20px 0;" />

        <!-- Google-Style Help Center & Contact Us -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px auto;">
          <tr>
            <td style="padding:0 12px;font-size:13px;font-family:'Google Sans',Roboto,Arial,sans-serif;">
              <a href="${termsUrl}#legal-contact" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:none;font-weight:500;">
                <span style="font-weight:bold;font-size:15px;">?</span>&nbsp;&nbsp;Help center
              </a>
            </td>
            <td style="color:#dadce0;font-size:14px;">|</td>
            <td style="padding:0 12px;font-size:13px;font-family:'Google Sans',Roboto,Arial,sans-serif;">
              <a href="${contactUrl}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:none;font-weight:500;">
                <span style="font-size:14px;">&#9993;</span>&nbsp;&nbsp;Contact us
              </a>
            </td>
          </tr>
        </table>

        <!-- Google-Style Legal Entity & Mandatory Notice -->
        <div style="text-align:center;font-size:12px;color:#70757a;line-height:1.5;margin-bottom:8px;">
          Gaurav Portfolio &bull; Full-Stack Engineer &bull; <a href="${appBaseUrl}" style="color:#70757a;text-decoration:none;">${appBaseUrl.replace(/^https?:\/\//, "")}</a>
        </div>

        <p style="margin:0 0 16px 0;font-size:11px;line-height:1.5;color:#70757a;text-align:center;">
          You have received this mandatory service announcement to update you about important changes to Gaurav Portfolio.<br />
          Please do not reply to this email, as replies to this automated address are not monitored.
        </p>

        <!-- Google-Style Bottom Watermark -->
        <div style="text-align:center;margin-top:16px;">
          <span style="font-size:16px;font-weight:600;color:#1a73e8;letter-spacing:-0.4px;">Gaurav</span>
          <span style="font-size:16px;font-weight:400;color:#70757a;letter-spacing:-0.4px;"> Portfolio</span>
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    htmlContent,
    textContent,
  };
}

export async function sendLegalNotificationEmail(params: {
  toEmail: string;
  toName?: string;
  docType: "TERMS" | "PRIVACY";
  version: string;
  effectiveDate: string;
  changeSummary: string;
  recipientType?: "VISITOR" | "ADMIN_AUDIT";
  idempotencyKey?: string;
}): Promise<SendEmailResult> {
  const { subject, htmlContent, textContent } = buildLegalNotificationEmail({
    docType: params.docType,
    version: params.version,
    effectiveDate: params.effectiveDate,
    changeSummary: params.changeSummary,
    recipientName: params.toName,
    recipientType: params.recipientType,
  });

  return await sendTransactionalEmail({
    identity: EMAIL_IDENTITIES.NO_REPLY,
    senderName: "Gaurav Portfolio",
    to: [{ email: params.toEmail, name: params.toName }],
    replyTo: { email: EMAIL_IDENTITIES.NO_REPLY.email, name: "Gaurav Portfolio" },
    subject,
    htmlContent,
    textContent,
    idempotencyKey: params.idempotencyKey,
  });
}
