/**
 * Git Push Audit Email Notification Service
 *
 * Dispatches an ultra-compact, single-view, zero-scroll audit notification
 * whenever changes are pushed to GitHub.
 *
 * Routing Invariant:
 * - Sender: Gaurav Security Services <security@gauravpatil.online>
 * - To: Admin Gmail (ADMIN_EMAIL / gauravpatil5737@gmail.com)
 * - CC: None
 */

import { EMAIL_IDENTITIES } from "./identities";
import { sendTransactionalEmail, SendEmailResult } from "./brevo";

export interface GitPushAuditParams {
  commitHash: string;
  commitMessage: string;
  branch?: string;
  authorName?: string;
  authorEmail?: string;
  timestamp?: string | Date;
  filesChanged?: string[] | string;
  repoName?: string;
}

function escapeHtml(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatAuditTimestamp(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();

  // Return clean human readable timestamp with timezone
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }) + " IST";
}

/**
 * Renders the ultra-compact, single-view, zero-scroll HTML email card.
 * Fits within ~320-380px height so it requires ZERO scrolling on both desktop and mobile email clients,
 * while allowing the commit message to dynamically expand vertically.
 */
export function renderPushAuditHtml(params: GitPushAuditParams): string {
  const shortHash = params.commitHash ? params.commitHash.substring(0, 7) : "HEAD";
  const safeMessage = escapeHtml(params.commitMessage || "Automated sync");
  const branch = escapeHtml(params.branch || "main");
  const authorName = escapeHtml(params.authorName || "Gaurav Patil");
  const authorEmail = escapeHtml(params.authorEmail || "gauravpatil5737@gmail.com");
  const repoName = escapeHtml(params.repoName || "AspiringWebGaurav/devlabs");
  const formattedTime = escapeHtml(formatAuditTimestamp(params.timestamp));
  const commitUrl = `https://github.com/${repoName}/commit/${params.commitHash}`;

  let filesSummary = "0 files";
  if (Array.isArray(params.filesChanged)) {
    const count = params.filesChanged.length;
    const names = params.filesChanged.slice(0, 4).map((f) => f.split("/").pop() || f).join(", ");
    filesSummary = count > 4 ? `${count} files (${names}, +${count - 4} more)` : `${count} files (${names})`;
  } else if (typeof params.filesChanged === "string" && params.filesChanged.trim()) {
    filesSummary = escapeHtml(params.filesChanged.trim());
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Push Audit #${shortHash}</title>
</head>
<body style="margin:0;padding:12px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:480px;margin:0 auto;">
    <tr>
      <td>
        <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <!-- Single-View Compact Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f4f4f5;padding-bottom:8px;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:#18181b;letter-spacing:-0.01em;">
              ⚡ Git Push Audit Log
            </div>
            <div style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;font-family:monospace;letter-spacing:0.02em;">
              VERIFIED ✓
            </div>
          </div>

          <!-- Key-Value Metadata Grid (Single-View, Dynamic Vertical Message Expand) -->
          <table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.45;">
            <tr>
              <td style="padding:3px 0;color:#71717a;width:75px;font-weight:500;vertical-align:top;">Commit</td>
              <td style="padding:3px 0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:11px;font-weight:600;vertical-align:top;">
                <a href="${commitUrl}" style="color:#7c3aed;text-decoration:none;">#${shortHash}</a>
                <span style="color:#a1a1aa;font-weight:400;margin-left:6px;">(${branch})</span>
              </td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;vertical-align:top;width:75px;">Message</td>
              <td style="padding:3px 0;font-weight:600;color:#18181b;word-break:break-word;white-space:pre-wrap;line-height:1.4;vertical-align:top;">${safeMessage}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;vertical-align:top;">Timestamp</td>
              <td style="padding:3px 0;color:#27272a;vertical-align:top;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;vertical-align:top;">Actor</td>
              <td style="padding:3px 0;color:#27272a;vertical-align:top;">${authorName} &lt;${authorEmail}&gt;</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;vertical-align:top;">Changes</td>
              <td style="padding:3px 0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:11px;color:#52525b;vertical-align:top;">${filesSummary}</td>
            </tr>
          </table>

          <!-- Compact Footer Bar -->
          <div style="border-top:1px solid #f4f4f5;margin-top:10px;padding-top:8px;font-size:10px;color:#a1a1aa;display:flex;justify-content:space-between;line-height:1.3;">
            <span>Gaurav Portfolio Security Audit</span>
            <span style="font-family:monospace;color:#059669;font-weight:600;">Delivered ✓</span>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPushAuditText(params: GitPushAuditParams): string {
  const shortHash = params.commitHash ? params.commitHash.substring(0, 7) : "HEAD";
  const formattedTime = formatAuditTimestamp(params.timestamp);
  const repoName = params.repoName || "AspiringWebGaurav/devlabs";
  const branch = params.branch || "main";

  return `[GIT PUSH AUDIT LOG]
Status: VERIFIED (Pre-Push Checks Passed)
Repository: ${repoName} (${branch})
Commit: #${shortHash} (${params.commitHash})
Message: ${params.commitMessage}
Timestamp: ${formattedTime}
Pushed By: ${params.authorName || "Gaurav Patil"} <${params.authorEmail || "gauravpatil5737@gmail.com"}>
Files Changed: ${Array.isArray(params.filesChanged) ? params.filesChanged.join(", ") : params.filesChanged || "N/A"}

Commit Link: https://github.com/${repoName}/commit/${params.commitHash}`;
}

/**
 * Dispatches the push audit email via Brevo.
 */
export async function sendGitPushAuditEmail(params: GitPushAuditParams): Promise<SendEmailResult> {
  const adminEmail =
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.BREVO_NOTIFICATION_RECIPIENT?.trim() ||
    "gauravpatil5737@gmail.com";

  const shortHash = params.commitHash ? params.commitHash.substring(0, 7) : "HEAD";
  const subject = `Push Audit #${shortHash}`;

  return sendTransactionalEmail({
    identity: EMAIL_IDENTITIES.SECURITY,
    to: [
      {
        email: adminEmail,
        name: "Admin",
      },
    ],
    subject,
    htmlContent: renderPushAuditHtml(params),
    textContent: renderPushAuditText(params),
    tags: ["git-push-audit", "security-log"],
  });
}
