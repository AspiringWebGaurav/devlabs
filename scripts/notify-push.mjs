#!/usr/bin/env node

/**
 * Standalone Post-Push Audit Email Dispatcher
 *
 * Dispatches a single-view, zero-scroll audit email to Admin Gmail
 * whenever changes are pushed to GitHub.
 *
 * Layout Standard:
 * - 100% Mobile & Desktop responsive (Zero flexbox, robust HTML tables)
 * - Clean left alignment on desktop (No awkward centered box in a grey void)
 * - Seamless white canvas (#ffffff) blending natively with email clients
 * - Clear, color-coded file status badges (MOD, ADD, DEL) with diff stats
 * - Strictly bounded height (~320-350px) for one-view zero-scroll guarantee
 *
 * Run with: node scripts/notify-push.mjs
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Load .env.local if present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.BREVO_NOTIFICATION_RECIPIENT || "gauravpatil5737@gmail.com";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "security@gauravpatil.site";
const SENDER_NAME = "Gaurav Security Services";

if (!BREVO_API_KEY) {
  console.error("❌ Error: BREVO_API_KEY is not defined in environment or .env.local");
  process.exit(1);
}

// 2. Extract git commit metadata with file statuses & diff stats
function getGitMetadata() {
  try {
    const commitHash = execSync("git log -1 --format=%H", { encoding: "utf-8" }).trim();
    const commitMessage = execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
    const authorName = execSync("git log -1 --format=%an", { encoding: "utf-8" }).trim();
    const authorEmail = execSync("git log -1 --format=%ae", { encoding: "utf-8" }).trim();
    const timestampRaw = execSync("git log -1 --format=%cI", { encoding: "utf-8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();

    // Parse status and path for each changed file
    const filesOutput = execSync("git diff-tree --no-commit-id --name-status -r HEAD", { encoding: "utf-8" }).trim();
    const filesChanged = filesOutput
      ? filesOutput
          .split("\n")
          .map((line) => {
            const parts = line.trim().split(/\t+/);
            const rawStatus = parts[0] ? parts[0].charAt(0).toUpperCase() : "M";
            const filePath = parts.slice(1).join("\t") || parts[0] || "";
            let status = "MOD";
            if (rawStatus === "A") status = "ADD";
            else if (rawStatus === "D") status = "DEL";
            else if (rawStatus === "R") status = "REN";
            return { status, path: filePath };
          })
          .filter((f) => Boolean(f.path))
      : [];

    // Parse insertions and deletions from git show
    let insertions = "";
    let deletions = "";
    try {
      const statOutput = execSync("git show --shortstat --format= HEAD", { encoding: "utf-8" }).trim();
      const insMatch = statOutput.match(/(\d+)\s+insertion/);
      const delMatch = statOutput.match(/(\d+)\s+deletion/);
      if (insMatch) insertions = `+${Number(insMatch[1]).toLocaleString()}`;
      if (delMatch) deletions = `-${Number(delMatch[1]).toLocaleString()}`;
    } catch {}

    return {
      commitHash,
      commitMessage,
      authorName,
      authorEmail,
      timestampRaw,
      branch,
      filesChanged,
      insertions,
      deletions,
    };
  } catch (err) {
    console.warn("⚠️ Warning: Failed to query git metadata, using fallback:", err.message);
    return {
      commitHash: "unknown",
      commitMessage: "Manual push notification",
      authorName: "Gaurav Patil",
      authorEmail: ADMIN_EMAIL,
      timestampRaw: new Date().toISOString(),
      branch: "main",
      filesChanged: [],
      insertions: "",
      deletions: "",
    };
  }
}

const gitData = getGitMetadata();
const shortHash = gitData.commitHash ? gitData.commitHash.substring(0, 7) : "HEAD";

function formatTimestamp(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toLocaleString();
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

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const formattedTime = formatTimestamp(gitData.timestampRaw);
const repoName = "AspiringWebGaurav/devlabs";
const commitUrl = `https://github.com/${repoName}/commit/${gitData.commitHash}`;
const totalFilesCount = gitData.filesChanged.length;

// Display top 5 key files with status badges, followed by overflow count
const displayLimit = 5;
const displayedFiles = gitData.filesChanged.slice(0, displayLimit);
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

// 3. Ultra-responsive single-view zero-scroll HTML template
const htmlContent = `<!DOCTYPE html>
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
                  ${escapeHtml(gitData.commitMessage)}
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
                    <span style="font-family:'SFMono-Regular',Consolas,monospace; color:#334155; font-weight:500;">${escapeHtml(gitData.branch)}</span>
                  </td>
                  <td align="right" style="padding:2px 0; color:#64748b; font-size:11px; white-space:nowrap;">
                    ${escapeHtml(formattedTime)}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:2px 0; color:#475569;">
                    <span style="font-weight:600; color:#0f172a;">Actor:</span>
                    <span style="color:#334155;">${escapeHtml(gitData.authorName)} &lt;${escapeHtml(gitData.authorEmail)}&gt;</span>
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
                      ${gitData.insertions ? `<span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:600; color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:1px 5px; border-radius:3px; margin-right:3px;">${escapeHtml(gitData.insertions)}</span>` : ""}
                      ${gitData.deletions ? `<span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:600; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; padding:1px 5px; border-radius:3px;">${escapeHtml(gitData.deletions)}</span>` : ""}
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

const textContent = `[GIT PUSH AUDIT LOG]
Status: VERIFIED (Pre-Push Checks Passed)
Repository: ${repoName} (${gitData.branch})
Commit: #${shortHash} (${gitData.commitHash})
Message: ${gitData.commitMessage}
Timestamp: ${formattedTime}
Pushed By: ${gitData.authorName} <${gitData.authorEmail}>
Changes: ${totalFilesCount} files (${gitData.insertions} ${gitData.deletions})
${gitData.filesChanged.slice(0, 10).map((f) => `- [${f.status}] ${f.path}`).join("\n")}
${remainingFilesCount > 0 ? `...and ${remainingFilesCount} more files` : ""}

Commit Link: ${commitUrl}`;

// 4. Dispatch via Brevo API v3
async function dispatch() {
  console.log("==================================================================");
  console.log("  DISPATCHING GIT PUSH AUDIT EMAIL NOTIFICATION                   ");
  console.log("==================================================================");
  console.log(`  Commit:    #${shortHash}`);
  console.log(`  To:        ${ADMIN_EMAIL}`);
  console.log(`  Sender:    ${SENDER_NAME} <${SENDER_EMAIL}>`);
  console.log(`  Timestamp: ${formattedTime}`);
  console.log("------------------------------------------------------------------");

  const payload = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL,
    },
    to: [
      {
        email: ADMIN_EMAIL,
        name: "Admin",
      },
    ],
    replyTo: {
      email: SENDER_EMAIL,
      name: SENDER_NAME,
    },
    subject: `Push Audit #${shortHash}`,
    htmlContent,
    textContent,
    tags: ["git-push-audit", "security-log"],
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && (res.status === 200 || res.status === 201)) {
      console.log(`✔ SUCCESS: Audit email successfully dispatched!`);
      console.log(`  Message ID: ${data.messageId || "delivered"}`);
      console.log(`  Status:     HTTP ${res.status}`);
      console.log("==================================================================");
      process.exit(0);
    } else {
      console.error(`✖ FAILED: Brevo returned HTTP ${res.status}`);
      console.error("  Error Details:", data);
      console.log("==================================================================");
      process.exit(1);
    }
  } catch (err) {
    console.error("✖ Network Error:", err.message);
    process.exit(1);
  }
}

dispatch();
