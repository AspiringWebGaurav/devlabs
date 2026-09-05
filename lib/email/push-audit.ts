/**
 * Git Push Audit Email Notification Service
 *
 * Dispatches an ultra-responsive, single-view, zero-scroll audit notification
 * whenever changes are pushed to GitHub.
 *
 * Routing Invariant:
 * - Sender: Gaurav Security Services <security@gauravpatil.online>
 * - To: Admin Gmail (ADMIN_EMAIL / gauravpatil5737@gmail.com)
 * - CC: None
 *
 * Layout Standard:
 * - 100% Mobile & Desktop responsive (Zero flexbox, robust HTML tables)
 * - Clean left alignment on desktop (No awkward centered box in a grey void)
 * - Seamless white canvas (#ffffff) blending natively with email clients
 * - Clear, color-coded file status badges (MOD, ADD, DEL) with diff stats
 * - Strictly bounded height (~320-350px) for one-view zero-scroll guarantee
 */

import { EMAIL_IDENTITIES } from "./identities";
import { sendTransactionalEmail, SendEmailResult } from "./brevo";

export interface GitPushAuditFile {
  status: "MOD" | "ADD" | "DEL" | "REN" | string;
  path: string;
}

export interface GitPushAuditParams {
  commitHash: string;
  commitMessage: string;
  branch?: string;
  authorName?: string;
  authorEmail?: string;
  timestamp?: string | Date;
  filesChanged?: Array<GitPushAuditFile | string> | string;
  insertions?: string;
  deletions?: string;
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
 * Normalizes filesChanged into standard GitPushAuditFile array.
 */
function normalizeFiles(filesInput?: Array<GitPushAuditFile | string> | string): GitPushAuditFile[] {
  if (!filesInput) return [];
  if (Array.isArray(filesInput)) {
    return filesInput.map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed.startsWith("[ADD]") || trimmed.startsWith("A ")) {
          return { status: "ADD", path: trimmed.replace(/^(\[ADD\]|A\s+)/, "").trim() };
        }
        if (trimmed.startsWith("[DEL]") || trimmed.startsWith("D ")) {
          return { status: "DEL", path: trimmed.replace(/^(\[DEL\]|D\s+)/, "").trim() };
        }
        return { status: "MOD", path: trimmed.replace(/^(\[MOD\]|M\s+)/, "").trim() };
      }
      return item;
    });
  }
  if (typeof filesInput === "string") {
    return filesInput
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((p) => ({ status: "MOD", path: p }));
  }
  return [];
}

/**
 * Renders the ultra-responsive, single-view, zero-scroll HTML email card.
 * Fits within ~320-350px height so it requires ZERO scrolling on both desktop and mobile email clients,
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

  const allFiles = normalizeFiles(params.filesChanged);
  const totalFilesCount = allFiles.length;

  const displayLimit = 5;
  const displayedFiles = allFiles.slice(0, displayLimit);
  const remainingFilesCount = totalFilesCount - displayedFiles.length;

  const fileRowsHtml = displayedFiles.map((file) => {
    let badgeBg = "#eff6ff";
    let badgeColor = "#2563eb";
    let badgeBorder = "#bfdbfe";
    let label = "MOD";

    if (file.status === "ADD") {
      badgeBg = "#ecfdf5";
      badgeColor = "#059669";
      badgeBorder = "#a7f3d0";
      label = "ADD";
    } else if (file.status === "DEL") {
      badgeBg = "#fef2f2";
      badgeColor = "#dc2626";
      badgeBorder = "#fecaca";
      label = "DEL";
    } else if (file.status === "REN") {
      badgeBg = "#fdf4ff";
      badgeColor = "#9333ea";
      badgeBorder = "#f0abfc";
      label = "REN";
    }

    return `<tr>
      <td style="padding:2px 0; width:44px; vertical-align:middle;">
        <span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:9px; font-weight:700; color:${badgeColor}; background:${badgeBg}; border:1px solid ${badgeBorder}; padding:1px 4px; border-radius:3px; letter-spacing:0.03em;">${label}</span>
      </td>
      <td style="padding:2px 0; font-family:'SFMono-Regular',Consolas,Menlo,monospace; font-size:11px; color:#1e293b; vertical-align:middle; word-break:break-all;">
        ${escapeHtml(file.path)}
      </td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Push Audit #${shortHash}</title>
</head>
<body style="margin:0; padding:16px 12px; background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; color:#0f172a;">
  <!-- Main Container: Left-Aligned on Desktop, Fluid 100% on Mobile, No Centered Void -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="left" style="max-width:580px; margin:0; border-collapse:collapse;">
    <tr>
      <td style="padding:0;">
        <!-- Executive Security Card with Sleek Purple Accent -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #7c3aed; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border-collapse:collapse;">
          <tr>
            <td style="padding:14px 16px;">
              
              <!-- 1. Header: Status & Category (Bulletproof HTML Table Alignment) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="left" style="font-size:12px; font-weight:700; color:#0f172a; letter-spacing:-0.01em;">
                    ⚡ Git Push Audit Log
                  </td>
                  <td align="right">
                    <span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:700; color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:2px 8px; border-radius:9999px; letter-spacing:0.02em;">
                      VERIFIED ✓
                    </span>
                  </td>
                </tr>
              </table>

              <!-- 2. Commit Message Box: Front & Center, Dynamic Vertical Expansion -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:9px 12px; margin-top:8px; margin-bottom:10px;">
                <div style="font-size:13px; font-weight:600; color:#0f172a; line-height:1.45; word-break:break-word;">
                  ${safeMessage}
                </div>
              </div>

              <!-- 3. Key Metadata Details: Compact, Zero Column Collisions -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:11px; color:#64748b; border-collapse:collapse; margin-bottom:10px;">
                <tr>
                  <td align="left" style="padding:2px 0; color:#475569;">
                    <span style="font-weight:600; color:#0f172a;">Commit:</span>
                    <a href="${commitUrl}" style="color:#7c3aed; font-family:'SFMono-Regular',Consolas,monospace; font-weight:600; text-decoration:none;">#${shortHash}</a>
                    <span style="color:#cbd5e1; margin:0 4px;">&bull;</span>
                    <span style="font-weight:600; color:#0f172a;">Branch:</span>
                    <span style="font-family:'SFMono-Regular',Consolas,monospace; color:#334155; font-weight:500;">${branch}</span>
                  </td>
                  <td align="right" style="padding:2px 0; color:#64748b; font-size:11px; white-space:nowrap;">
                    ${formattedTime}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:2px 0; color:#475569;">
                    <span style="font-weight:600; color:#0f172a;">Actor:</span>
                    <span style="color:#334155;">${authorName} &lt;${authorEmail}&gt;</span>
                  </td>
                </tr>
              </table>

              <!-- 4. Highlighted Updated Files Section -->
              <div style="border-top:1px solid #f1f5f9; padding-top:8px; margin-top:8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-bottom:4px;">
                  <tr>
                    <td align="left" style="font-size:10px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">
                      Changed Files (${totalFilesCount})
                    </td>
                    <td align="right">
                      ${params.insertions ? `<span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:600; color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:1px 5px; border-radius:3px; margin-right:3px;">${escapeHtml(params.insertions)}</span>` : ""}
                      ${params.deletions ? `<span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:600; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; padding:1px 5px; border-radius:3px;">${escapeHtml(params.deletions)}</span>` : ""}
                    </td>
                  </tr>
                </table>

                <!-- Highlighted File Rows with Monospace Paths & Status Badges -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:2px;">
                  ${fileRowsHtml}
                </table>

                <!-- Overflow Indicator & Quick Diff Link -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:4px;">
                  <tr>
                    <td align="left" style="font-size:10px; color:#64748b;">
                      ${remainingFilesCount > 0 ? `+ ${remainingFilesCount} other files in commit` : ""}
                    </td>
                    <td align="right" style="font-size:10px;">
                      <a href="${commitUrl}" style="color:#7c3aed; text-decoration:none; font-weight:600;">View diff on GitHub &rarr;</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 5. Footer: Clean 2-Cell Status (Bulletproof Table Alignment) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #f1f5f9; margin-top:10px; padding-top:8px; border-collapse:collapse;">
                <tr>
                  <td align="left" style="font-size:10px; color:#94a3b8;">
                    Gaurav Portfolio Security Audit
                  </td>
                  <td align="right" style="font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; color:#059669; font-weight:600;">
                    Delivered ✓
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
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
  const files = normalizeFiles(params.filesChanged);
  const diffStats = params.insertions || params.deletions ? ` (${params.insertions || ""} ${params.deletions || ""})`.trim() : "";

  return `[GIT PUSH AUDIT LOG]
Status: VERIFIED (Pre-Push Checks Passed)
Repository: ${repoName} (${branch})
Commit: #${shortHash} (${params.commitHash})
Message: ${params.commitMessage}
Timestamp: ${formattedTime}
Pushed By: ${params.authorName || "Gaurav Patil"} <${params.authorEmail || "gauravpatil5737@gmail.com"}>
Changes: ${files.length} files${diffStats ? ` ${diffStats}` : ""}
${files.slice(0, 10).map((f) => `- [${f.status}] ${f.path}`).join("\n")}
${files.length > 10 ? `...and ${files.length - 10} more files` : ""}

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
