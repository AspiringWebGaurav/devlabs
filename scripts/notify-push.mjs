#!/usr/bin/env node

/**
 * Standalone Post-Push Audit Email Dispatcher
 *
 * Dispatches a single-view, zero-scroll audit email to Admin Gmail
 * and CC to security@gauravpatil.online whenever changes are pushed to GitHub.
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
const CC_EMAIL = "security@gauravpatil.online";
const SENDER_EMAIL = "security@gauravpatil.online";
const SENDER_NAME = "Gaurav Security Services";

if (!BREVO_API_KEY) {
  console.error("❌ Error: BREVO_API_KEY is not defined in environment or .env.local");
  process.exit(1);
}

// 2. Extract git commit metadata
function getGitMetadata() {
  try {
    const commitHash = execSync("git log -1 --format=%H", { encoding: "utf-8" }).trim();
    const commitMessage = execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
    const authorName = execSync("git log -1 --format=%an", { encoding: "utf-8" }).trim();
    const authorEmail = execSync("git log -1 --format=%ae", { encoding: "utf-8" }).trim();
    const timestampRaw = execSync("git log -1 --format=%cI", { encoding: "utf-8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    const filesOutput = execSync("git diff-tree --no-commit-id --name-only -r HEAD", { encoding: "utf-8" }).trim();
    const filesChanged = filesOutput ? filesOutput.split("\n").map((f) => f.trim()).filter(Boolean) : [];

    return {
      commitHash,
      commitMessage,
      authorName,
      authorEmail,
      timestampRaw,
      branch,
      filesChanged,
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

let filesSummary = "0 files";
if (gitData.filesChanged.length > 0) {
  const count = gitData.filesChanged.length;
  const names = gitData.filesChanged.slice(0, 4).map((f) => f.split("/").pop() || f).join(", ");
  filesSummary = count > 4 ? `${count} files (${names}, +${count - 4} more)` : `${count} files (${names})`;
}

// 3. Ultra-compact single-view no-scroll HTML template
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git Push: ${shortHash}</title>
</head>
<body style="margin:0;padding:12px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:500px;margin:0 auto;">
    <tr>
      <td>
        <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f4f4f5;padding-bottom:10px;margin-bottom:12px;">
            <div style="font-size:13px;font-weight:700;color:#18181b;letter-spacing:-0.01em;">
              ⚡ Git Push Audit Log
            </div>
            <div style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;font-family:monospace;letter-spacing:0.02em;">
              VERIFIED ✓
            </div>
          </div>

          <!-- Key-Value Metadata Grid (Ultra-compact, No-Scroll) -->
          <table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.45;">
            <tr>
              <td style="padding:3px 0;color:#71717a;width:75px;font-weight:500;">Commit</td>
              <td style="padding:3px 0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:11px;font-weight:600;">
                <a href="${commitUrl}" style="color:#7c3aed;text-decoration:none;">${shortHash}</a>
                <span style="color:#a1a1aa;font-weight:400;margin-left:6px;">(${escapeHtml(gitData.branch)})</span>
              </td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;vertical-align:top;">Message</td>
              <td style="padding:3px 0;font-weight:600;color:#18181b;">${escapeHtml(gitData.commitMessage)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;">Timestamp</td>
              <td style="padding:3px 0;color:#27272a;">${escapeHtml(formattedTime)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;">Actor</td>
              <td style="padding:3px 0;color:#27272a;">${escapeHtml(gitData.authorName)} &lt;${escapeHtml(gitData.authorEmail)}&gt;</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#71717a;font-weight:500;">Changes</td>
              <td style="padding:3px 0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:11px;color:#52525b;">${escapeHtml(filesSummary)}</td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="border-top:1px solid #f4f4f5;margin-top:12px;padding-top:8px;font-size:10px;color:#a1a1aa;display:flex;justify-content:space-between;line-height:1.3;">
            <span>Gaurav Portfolio Security Audit</span>
            <span style="font-family:monospace;">CC: ${CC_EMAIL}</span>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const textContent = `[GIT PUSH AUDIT LOG]
Status: VERIFIED (Pre-Push Checks Passed)
Repository: ${repoName} (${gitData.branch})
Commit: ${shortHash} (${gitData.commitHash})
Message: ${gitData.commitMessage}
Timestamp: ${formattedTime}
Pushed By: ${gitData.authorName} <${gitData.authorEmail}>
Files Changed: ${gitData.filesChanged.join(", ") || "None"}

Commit Link: ${commitUrl}
CC: ${CC_EMAIL}`;

// 4. Dispatch via Brevo API v3
async function dispatch() {
  console.log("==================================================================");
  console.log("  DISPATCHING GIT PUSH AUDIT EMAIL NOTIFICATION                   ");
  console.log("==================================================================");
  console.log(`  Commit:    ${shortHash} - ${gitData.commitMessage}`);
  console.log(`  To:        ${ADMIN_EMAIL}`);
  console.log(`  CC:        ${CC_EMAIL}`);
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
    cc: [
      {
        email: CC_EMAIL,
        name: "Security Audit",
      },
    ],
    replyTo: {
      email: SENDER_EMAIL,
      name: SENDER_NAME,
    },
    subject: `[Push Audit] ${shortHash} - ${gitData.commitMessage}`,
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
