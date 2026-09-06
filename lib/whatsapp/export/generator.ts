/**
 * WhatsApp Data Export Bundle Compiler & Crypto Signer
 *
 * Implements GDPR Article 20 & CCPA Data Portability requirements:
 * - Root-directory packaging: Extracts cleanly into named folder (Gaurav_Patil_Data_Export_<phone>/)
 * - Cryptographic HMAC-SHA256 URL signing
 * - Self-contained, responsive Dark Luxury offline HTML transcript
 * - Machine-readable structured JSON conversation history (RFC 8259)
 * - Regulatory consent and telemetry audit log
 * - Cryptographic system security & infrastructure report
 * - WhatsApp channel terms of service & privacy policies disclosure
 * - Cryptographic SHA-256 integrity checksum manifest
 * - Official Data Portability Compliance Certificate
 */

import crypto from "crypto";
import { createZipArchive, type ZipFileEntry } from "./zip";
import { getWhatsAppBaseUrl } from "../config/whatsapp.config";

export interface ExportMessageRecord {
  id: string;
  sender: "visitor" | "assistant";
  text: string;
  timestamp: string; // IST string
  createdAt: number; // Unix ms
}

export interface ExportSessionData {
  phone: string;
  email?: string;
  messageCount: number;
  hasReceivedResume: boolean;
  inChatMode?: boolean;
  lastActivityAt: number;
}

export interface VerifyExportResult {
  valid: boolean;
  expired: boolean;
  reason?: "invalid_signature" | "link_expired" | "legacy_link_expired" | "missing_params";
}

/**
 * Creates an HMAC-SHA256 signature specifically for WhatsApp data export downloads.
 * Cryptographically binds the phone number and the 10-minute expiration timestamp.
 */
export function createExportSignature(phone: string, expires?: number | string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "wa_export_data_secret_key";
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const payload = expires ? `export:${cleanPhone}:${expires}` : `export:${cleanPhone}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifies the export signature against the phone number and 10-minute expiration window.
 * Permanently expires old legacy links that were issued without an expiration timestamp.
 */
export function verifyExportSignature(
  phone: string,
  signature: string,
  expires?: number | string | null
): VerifyExportResult {
  if (!phone || !signature) {
    return { valid: false, expired: false, reason: "missing_params" };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const secret = process.env.ADMIN_SESSION_SECRET || "wa_export_data_secret_key";

  // Case 1: Old legacy links generated without an expiration timestamp
  // Per GDPR Art. 20 & privacy invariants: all old links are permanently expired.
  if (!expires) {
    const legacyExpected = crypto.createHmac("sha256", secret).update(`export:${cleanPhone}`).digest("hex");
    const isLegacyMatch =
      legacyExpected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(legacyExpected), Buffer.from(signature));

    return {
      valid: false,
      expired: true,
      reason: isLegacyMatch ? "legacy_link_expired" : "invalid_signature",
    };
  }

  // Case 2: Timestamped link verification
  const expiresNum = Number(expires);
  if (isNaN(expiresNum)) {
    return { valid: false, expired: false, reason: "invalid_signature" };
  }

  // Check 10-minute expiry window
  if (Date.now() > expiresNum) {
    return { valid: false, expired: true, reason: "link_expired" };
  }

  // Cryptographic signature check on `export:${cleanPhone}:${expires}`
  const expected = createExportSignature(cleanPhone, expiresNum);
  if (expected.length !== signature.length) {
    return { valid: false, expired: false, reason: "invalid_signature" };
  }

  const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  return {
    valid: isValid,
    expired: false,
    reason: isValid ? undefined : "invalid_signature",
  };
}

/**
 * Escapes HTML characters for safe rendering inside the transcript.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 01: Official GDPR Article 20 & CCPA Data Portability Compliance Certificate.
 */
export function generateReadmeCertificate(
  session: ExportSessionData,
  exportId: string
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const exportDate = new Date().toISOString();
  const exportDateIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const baseUrl = getWhatsAppBaseUrl();

  return (
    `=======================================================================\n` +
    `GAURAV PATIL PORTFOLIO — OFFICIAL DATA PORTABILITY CERTIFICATE\n` +
    `Compliance Standard: GDPR Article 20 (Right to Data Portability) & CCPA\n` +
    `Certificate Identifier: ${exportId}\n` +
    `=======================================================================\n\n` +
    `DATA CONTROLLER INFORMATION:\n` +
    `-----------------------------------------------------------------------\n` +
    `Data Controller:    Gaurav Patil (Full-Stack Engineer & System Architect)\n` +
    `Official Website:   ${baseUrl}\n` +
    `Security Contact:   security@gauravpatil.site\n` +
    `Legal Channel:      hello@gauravpatil.site\n` +
    `Jurisdiction:       European Union (GDPR), California (CCPA/CPRA), India (DPDPA)\n\n` +
    `DATA SUBJECT DETAILS:\n` +
    `-----------------------------------------------------------------------\n` +
    `WhatsApp Number:    +${cleanPhone}\n` +
    `Registered Email:   ${session.email || "Not Provided (Direct WhatsApp Only)"}\n` +
    `Session Mode:       ${session.inChatMode ? "Active Free-Form Chat Mode" : "Standard Channel Onboarding"}\n` +
    `Total Inquiries:    ${session.messageCount} of 3 maximum quota per session\n` +
    `Remaining Quota:    ${Math.max(0, 3 - session.messageCount)} message(s)\n` +
    `Resume Delivered:   ${session.hasReceivedResume ? "Yes (Official Verified PDF Dispatched)" : "No"}\n` +
    `Export Time (UTC):  ${exportDate}\n` +
    `Export Time (IST):  ${exportDateIST} (IST)\n\n` +
    `LEGAL BASIS & PURPOSE OF PROCESSING:\n` +
    `-----------------------------------------------------------------------\n` +
    `1. Purpose: Direct professional communication, recruiter inquiries, and\n` +
    `   portfolio introductions via official Meta WhatsApp Cloud API.\n` +
    `2. Lawful Basis:\n` +
    `   • Explicit Consent (GDPR Art. 6(1)(a)): Inbound communication initiated by visitor\n` +
    `   • Legitimate Interest (GDPR Art. 6(1)(f)): Authentic networking and inquiry response\n` +
    `3. Data Retention Policy: Ephemeral session caching with 24-hour inactivity\n` +
    `   timeout. Permanent cryptographic purge upon visitor request.\n\n` +
    `YOUR DATA PRIVACY RIGHTS:\n` +
    `-----------------------------------------------------------------------\n` +
    `• Right to Erasure (Right to be Forgotten — GDPR Art. 17):\n` +
    `  You may permanently erase your entire session and messages from our database\n` +
    `  at any time by replying "STOP" directly in your WhatsApp conversation.\n` +
    `• Right to Rectification (GDPR Art. 16):\n` +
    `  You can update your registered email anytime in WhatsApp or by contacting\n` +
    `  security@gauravpatil.site.\n` +
    `• Right to Data Portability (GDPR Art. 20):\n` +
    `  You may re-download your updated archive at any time by sending /exportmydata.\n\n` +
    `ARCHIVE MANIFEST (FILES IN THIS DIRECTORY):\n` +
    `-----------------------------------------------------------------------\n` +
    `01_README_Data_Portability_Certificate.txt  -> Official GDPR Art. 20 legal certificate\n` +
    `02_chat_transcript.html                     -> Visual, offline Dark Luxury chat transcript\n` +
    `03_conversation_history.json                -> Machine-readable structured conversation export\n` +
    `04_consent_and_telemetry_audit.json         -> Technical compliance & consent audit record\n` +
    `05_system_security_report.json              -> Cryptographic signature & infrastructure audit\n` +
    `06_official_channel_policies.txt            -> Complete WhatsApp Channel Terms & Privacy Rules\n` +
    `07_sha256_checksums.txt                     -> Cryptographic SHA-256 integrity verification\n\n` +
    `=======================================================================\n` +
    `Generated cryptographically on-demand by Gaurav Patil Portfolio Gateway.\n` +
    `=======================================================================\n`
  );
}

/**
 * 02: Self-contained, responsive Dark Luxury HTML chat transcript.
 */
export function generateHtmlTranscript(
  session: ExportSessionData,
  messages: ExportMessageRecord[],
  exportId: string
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const exportTimeIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const exportTimeUTC = new Date().toISOString();
  const baseUrl = getWhatsAppBaseUrl();

  const messageRowsHtml =
    messages.length === 0
      ? `<div class="empty-state">No chat messages recorded in this session.</div>`
      : messages
          .map((msg, idx) => {
            const isVisitor = msg.sender === "visitor";
            const safeContent = escapeHtml(msg.text).replace(/\n/g, "<br/>");
            const charCount = msg.text.length;
            const wordCount = msg.text.trim().split(/\s+/).filter(Boolean).length;
            const msgUtc = new Date(msg.createdAt).toISOString();

            return `
              <div class="message-row ${isVisitor ? "visitor" : "assistant"}">
                <div class="bubble">
                  <div class="meta">
                    <span class="sender-name">
                      <span class="seq-tag">#${idx + 1}</span>
                      ${isVisitor ? "You (Visitor)" : "Gaurav's Assistant"}
                    </span>
                    <span class="time">${escapeHtml(msg.timestamp)}</span>
                  </div>
                  <div class="content">${safeContent}</div>
                  <div class="bubble-footer">
                    <span>${charCount} chars &bull; ${wordCount} words</span>
                    <span title="UTC: ${msgUtc}">ID: ${escapeHtml(msg.id)}</span>
                  </div>
                </div>
              </div>
            `;
          })
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WhatsApp Chat Transcript | Gaurav Patil Portfolio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000319;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px 16px;
      line-height: 1.5;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #05081E;
      border: 1px solid rgba(203, 172, 249, 0.2);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }
    .header {
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(203, 172, 249, 0.1) 0%, rgba(124, 58, 237, 0.12) 100%);
      border-bottom: 1px solid rgba(203, 172, 249, 0.2);
    }
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #10B981;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cert-id {
      font-family: monospace;
      font-size: 11px;
      color: #CBACF9;
      background: rgba(203, 172, 249, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }
    h1 {
      font-size: 19px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .subtitle {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 6px;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
    }
    .meta-item span {
      display: block;
      color: #94A3B8;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-item strong {
      color: #E2E8F0;
      font-size: 12.5px;
    }
    .chat-area {
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 280px;
      background: #020412;
    }
    .message-row {
      display: flex;
      width: 100%;
    }
    .message-row.visitor {
      justify-content: flex-end;
    }
    .message-row.assistant {
      justify-content: flex-start;
    }
    .bubble {
      max-width: 82%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 13.5px;
      position: relative;
    }
    .message-row.visitor .bubble {
      background: #059669;
      color: #FFFFFF;
      border-bottom-right-radius: 2px;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
    }
    .message-row.assistant .bubble {
      background: #1E293B;
      color: #F1F5F9;
      border: 1px solid #334155;
      border-bottom-left-radius: 2px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      margin-bottom: 6px;
      opacity: 0.9;
    }
    .seq-tag {
      opacity: 0.7;
      font-weight: 400;
      margin-right: 4px;
      font-family: monospace;
    }
    .sender-name { font-weight: 600; }
    .content { word-break: break-word; line-height: 1.5; font-size: 13.5px; }
    .bubble-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 9.5px;
      opacity: 0.7;
      font-family: monospace;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #64748B;
      font-size: 13px;
    }
    .telemetry-summary {
      padding: 14px 24px;
      background: #030617;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      color: #94A3B8;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .footer {
      padding: 14px 24px;
      background: #05081E;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 11px;
      color: #64748B;
    }
    .footer a {
      color: #CBACF9;
      text-decoration: none;
    }
    @media print {
      body { background: #FFFFFF; color: #000000; }
      .container { border: 1px solid #CCCCCC; box-shadow: none; max-width: 100%; }
      .message-row.visitor .bubble { background: #E2E8F0; color: #000000; border: 1px solid #CBD5E1; }
      .message-row.assistant .bubble { background: #F8FAFC; color: #000000; border: 1px solid #E2E8F0; }
      .header { background: #F1F5F9; }
      .chat-area { background: #FFFFFF; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-row">
        <div class="brand">
          <h1>Gaurav Patil &bull; WhatsApp Transcript</h1>
        </div>
        <span class="badge">GDPR Art. 20 Export</span>
      </div>
      <div class="cert-id">${exportId}</div>
      <p class="subtitle">Official conversation record downloaded under GDPR Article 20 data portability rights.</p>

      <div class="metadata-grid">
        <div class="meta-item">
          <span>Phone Number</span>
          <strong>+${cleanPhone}</strong>
        </div>
        <div class="meta-item">
          <span>Registered Email</span>
          <strong>${session.email ? escapeHtml(session.email) : "Not Provided"}</strong>
        </div>
        <div class="meta-item">
          <span>Resume Delivered</span>
          <strong>${session.hasReceivedResume ? "Yes" : "No"}</strong>
        </div>
        <div class="meta-item">
          <span>Inquiries Sent</span>
          <strong>${session.messageCount} of 3</strong>
        </div>
        <div class="meta-item">
          <span>Export Time (IST)</span>
          <strong>${exportTimeIST}</strong>
        </div>
        <div class="meta-item">
          <span>Export Time (UTC)</span>
          <strong>${exportTimeUTC.slice(0, 19)}Z</strong>
        </div>
      </div>
    </div>

    <div class="chat-area">
      ${messageRowsHtml}
    </div>

    <div class="telemetry-summary">
      <span>Total Messages: <strong>${messages.length}</strong></span>
      <span>Inquiry Quota Usage: <strong>${session.messageCount}/3</strong></span>
      <span>Transport Encryption: <strong>TLS 1.3 / HTTPS</strong></span>
      <span>Storage Location: <strong>Firestore (AES-256)</strong></span>
    </div>

    <div class="footer">
      Official Portfolio Communication &bull; <a href="${baseUrl}" target="_blank" rel="noopener noreferrer">${baseUrl.replace(/^https?:\/\//, "")}</a> &bull; Data Controller: Gaurav Patil
    </div>
  </div>
</body>
</html>`;
}

/**
 * 03: Structured Machine-Readable JSON Export (RFC 8259).
 */
function generateStructuredJsonHistory(
  session: ExportSessionData,
  messages: ExportMessageRecord[],
  exportId: string
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const baseUrl = getWhatsAppBaseUrl();
  const visitorCount = messages.filter((m) => m.sender === "visitor").length;
  const assistantCount = messages.filter((m) => m.sender === "assistant").length;
  const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);

  const payload = {
    $schema: `${baseUrl}/schemas/whatsapp-data-export-v2.json`,
    exportId,
    exportType: "GAURAV_PATIL_PORTFOLIO_WHATSAPP_DATA_EXPORT",
    version: "2.0.0",
    compliance: "GDPR_ARTICLE_20_DATA_PORTABILITY",
    exportedAtUTC: new Date().toISOString(),
    exportedAtIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    dataController: {
      name: "Gaurav Patil",
      title: "Full-Stack Engineer & System Architect",
      website: baseUrl,
      securityEmail: "security@gauravpatil.site",
      legalEmail: "hello@gauravpatil.site",
      privacyPolicyUrl: `${baseUrl}/privacy?focus=whatsapp#whatsapp-data-export`,
      termsUrl: `${baseUrl}/terms?focus=whatsapp#whatsapp-terms`,
    },
    dataSubject: {
      phone: `+${cleanPhone}`,
      registeredEmail: session.email || null,
      messageCount: session.messageCount,
      maxInquiryQuota: 3,
      inChatMode: Boolean(session.inChatMode),
      hasReceivedResume: session.hasReceivedResume,
      lastActivityAtUnixMs: session.lastActivityAt,
      accountPseudonymHash: crypto.createHash("sha256").update(cleanPhone).digest("hex").slice(0, 16),
    },
    messages: messages.map((m, index) => ({
      sequenceIndex: index + 1,
      id: m.id,
      sender: m.sender,
      role: m.sender === "visitor" ? "user" : "assistant",
      text: m.text,
      characterCount: m.text.length,
      wordCount: m.text.trim().split(/\s+/).filter(Boolean).length,
      timestampIST: m.timestamp,
      createdAtUnixMs: m.createdAt,
      createdAtUTC: new Date(m.createdAt).toISOString(),
    })),
    telemetrySummary: {
      totalMessages: messages.length,
      visitorMessages: visitorCount,
      assistantMessages: assistantCount,
      totalCharactersExchanged: totalChars,
      activeChatQuotaUsed: `${session.messageCount}/3`,
      isRateLimitEnforced: true,
      inactivityRetentionHours: 24,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * 04: Regulatory Consent & Telemetry Audit Log.
 */
function generateConsentAuditLog(
  session: ExportSessionData,
  exportId: string,
  totalMessages: number
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const baseUrl = getWhatsAppBaseUrl();

  const audit = {
    auditRecordId: `AUDIT-CONSENT-${cleanPhone}-${Date.now().toString(36).toUpperCase()}`,
    certificateIdentifier: exportId,
    timestampUTC: new Date().toISOString(),
    timestampIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    consentProfile: {
      subjectPhone: `+${cleanPhone}`,
      registeredEmail: session.email || null,
      consentStatus: "ACTIVE_EXPLICIT_OPT_IN",
      consentInitiationMethod: "INBOUND_USER_INITIATED_WHATSAPP_CONVERSATION",
      lawfulBases: [
        "GDPR Article 6(1)(a) — Explicit Freely Given Consent",
        "GDPR Article 6(1)(f) — Legitimate Interests (Direct Recruiter Networking)",
        "GDPR Article 6(1)(b) — Pre-Contractual Steps on Request",
      ],
      jurisdictionFrameworks: [
        "General Data Protection Regulation (Regulation EU 2016/679)",
        "California Consumer Privacy Act / CPRA (Cal. Civ. Code § 1798.100)",
        "Digital Personal Data Protection Act 2023 (India)",
      ],
      erasureCommand: "STOP",
      resetCommand: "START",
      termsFocusAnchor: `${baseUrl}/terms?focus=whatsapp#whatsapp-terms`,
      privacyFocusAnchor: `${baseUrl}/privacy?focus=whatsapp#whatsapp-data-export`,
    },
    channelTelemetry: {
      protocol: "Meta WhatsApp Cloud API v22.0",
      transportEncryption: "TLS 1.3 / HTTPS",
      storageProvider: "Google Cloud Platform (Firestore)",
      storageEncryption: "AES-256 (Google-Managed Encryption Keys)",
      inactivityTimeoutHours: 24,
      totalInquiriesSubmitted: session.messageCount,
      inquiryQuotaCeiling: 3,
      resumeRequested: session.hasReceivedResume,
      totalLoggedEvents: totalMessages,
    },
  };

  return JSON.stringify(audit, null, 2);
}

/**
 * 05: Technical System Security & Cryptographic Audit Report.
 */
function generateSystemSecurityReport(
  session: ExportSessionData,
  exportId: string,
  expires?: number
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const baseUrl = getWhatsAppBaseUrl();
  const exportSig = expires ? createExportSignature(cleanPhone, expires) : createExportSignature(cleanPhone);

  const security = {
    securityReportId: `SEC-AUDIT-${cleanPhone}-${Date.now().toString(36).toUpperCase()}`,
    certificateIdentifier: exportId,
    generatedAtUTC: new Date().toISOString(),
    securityPosture: {
      cloudProvider: "Vercel Serverless Edge Platform",
      dataStorage: "Google Cloud Platform Firestore (Default Multi-Region)",
      transportSecurity: "TLS 1.3 with HSTS (Strict-Transport-Security)",
      webhookAuthentication: "HMAC-SHA256 (Meta X-Hub-Signature-256 header verification)",
      dataExportAuthentication: "HMAC-SHA256 Cryptographic Link Signature",
      linkExpirationPolicy: "Strict 10 minutes (600s) ephemeral download window",
      expiresAtUTC: expires ? new Date(expires).toISOString() : "10 minutes post-issuance",
      activeExportSignature: exportSig,
      signatureTimingProtection: "crypto.timingSafeEqual enabled (constant-time verification)",
    },
    privacyControls: {
      thirdPartyAdvertisingTrackers: 0,
      analyticsCookies: 0,
      ipTrackingPolicy: "IP addresses are NEVER stored or associated with WhatsApp phone records",
      messageQuotaEnforcement: "Strict atomic ceiling (3 inquiries per session)",
      dataMinimization: "Only phone number and optional user-provided email stored",
    },
    endpoints: {
      inboundWebhook: `${baseUrl}/api/whatsapp/webhook`,
      exportDownload: expires
        ? `${baseUrl}/api/whatsapp/export?phone=${cleanPhone}&expires=${expires}&sig=${exportSig}`
        : `${baseUrl}/api/whatsapp/export?phone=${cleanPhone}&sig=${exportSig}`,
      admin1ClickNotify: `${baseUrl}/admin/whatsapp/notify`,
    },
  };

  return JSON.stringify(security, null, 2);
}

/**
 * 06: Official WhatsApp Channel Terms & Privacy Policies.
 */
function generateChannelPolicies(): string {
  const baseUrl = getWhatsAppBaseUrl();

  return (
    `=======================================================================\n` +
    `GAURAV PATIL PORTFOLIO — OFFICIAL WHATSAPP CHANNEL POLICIES & TERMS\n` +
    `=======================================================================\n` +
    `Last Updated: September 2026\n` +
    `Applicable Channel: Meta WhatsApp Cloud API Official Channel\n\n` +
    `1. CHANNEL SCOPE & PURPOSE\n` +
    `-----------------------------------------------------------------------\n` +
    `This official WhatsApp communication channel is dedicated to professional\n` +
    `networking, recruiter outreach, engineering collaboration, and direct\n` +
    `inquiries for Gaurav Patil (Full-Stack Engineer & System Architect).\n\n` +
    `Official Web Portal:   ${baseUrl}\n` +
    `Channel Terms:          ${baseUrl}/terms?focus=whatsapp#whatsapp-terms\n` +
    `Privacy & Data Policy:  ${baseUrl}/privacy?focus=whatsapp#whatsapp-data-export\n` +
    `Security Center:        ${baseUrl}/security\n\n` +
    `2. CONVERSATION QUOTA & FAIR USAGE\n` +
    `-----------------------------------------------------------------------\n` +
    `• Direct Inquiries: Each visitor may send up to three (3) direct inquiries\n` +
    `  per active session.\n` +
    `• Priority Forwarding: Every inbound inquiry is delivered directly to\n` +
    `  Gaurav in real time with an instant push alert and email notification.\n` +
    `• Rate Limiting: Strict message quotas protect against abuse, automated\n` +
    `  crawlers, and denial of service.\n\n` +
    `3. DATA PROTECTION & PRIVACY COMPLIANCE (GDPR & CCPA)\n` +
    `-----------------------------------------------------------------------\n` +
    `• Right of Access & Portability (GDPR Art. 15 & 20):\n` +
    `  You may download your entire conversation and audit history at any time\n` +
    `  by typing /exportmydata or visiting the portfolio privacy portal.\n` +
    `• Right to Erasure / Right to be Forgotten (GDPR Art. 17):\n` +
    `  Send the word STOP or UNSUBSCRIBE at any time to immediately and\n` +
    `  permanently delete your phone number, email, and conversation history\n` +
    `  from Google Cloud Firestore.\n` +
    `• Ephemeral Retention:\n` +
    `  Sessions expire automatically after 24 hours of inactivity.\n\n` +
    `4. ACCEPTABLE USE\n` +
    `-----------------------------------------------------------------------\n` +
    `Visitors agree to use this channel strictly for lawful, professional\n` +
    `inquiries. Harassment, spam, automated solicitation, or abusive language\n` +
    `will result in immediate termination of the communication session.\n` +
    `=======================================================================\n`
  );
}

/**
 * Generates the complete PKZip Buffer ready to be streamed to the client.
 *
 * All files are cleanly enclosed within a root directory named after the export
 * (Gaurav_Patil_Data_Export_<phone>/) so extracting the archive NEVER spills
 * loose files onto the user's desktop or downloads folder.
 */
export function compileExportZipBundle(
  session: ExportSessionData,
  messages: ExportMessageRecord[],
  expires?: number
): Buffer {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const rootFolder = `Gaurav_Patil_Data_Export_${cleanPhone}`;
  const exportId = `CERT-GDPR-WA-${cleanPhone}-${Date.now().toString(36).toUpperCase()}`;

  // 1. Generate all individual file contents
  const readmeContent = generateReadmeCertificate(session, exportId);
  const htmlContent = generateHtmlTranscript(session, messages, exportId);
  const jsonContent = generateStructuredJsonHistory(session, messages, exportId);
  const consentAuditContent = generateConsentAuditLog(session, exportId, messages.length);
  const securityReportContent = generateSystemSecurityReport(session, exportId, expires);
  const policiesContent = generateChannelPolicies();

  // 2. Compute SHA-256 cryptographic checksums for files 01 through 06
  const filesToHash = [
    { name: "01_README_Data_Portability_Certificate.txt", content: readmeContent },
    { name: "02_chat_transcript.html", content: htmlContent },
    { name: "03_conversation_history.json", content: jsonContent },
    { name: "04_consent_and_telemetry_audit.json", content: consentAuditContent },
    { name: "05_system_security_report.json", content: securityReportContent },
    { name: "06_official_channel_policies.txt", content: policiesContent },
  ];

  const checksumLines = filesToHash.map((f) => {
    const hash = crypto.createHash("sha256").update(Buffer.from(f.content, "utf8")).digest("hex");
    return `${hash}  ${f.name}`;
  });

  const checksumContent =
    `# GAURAV PATIL PORTFOLIO — OFFICIAL SHA-256 INTEGRITY MANIFEST\n` +
    `# Certificate ID: ${exportId}\n` +
    `# Generated (UTC): ${new Date().toISOString()}\n` +
    `# Standard: SHA-256 (FIPS 180-4)\n` +
    `# Verify with: sha256sum -c 07_sha256_checksums.txt\n\n` +
    checksumLines.join("\n") +
    "\n";

  // 3. Assemble all entries with root folder prefix (prevents naked file extraction)
  const entries: ZipFileEntry[] = [
    // Explicit root directory entry
    { name: `${rootFolder}/`, content: Buffer.alloc(0) },
    // All companion documents inside the root folder
    ...filesToHash.map((f) => ({
      name: `${rootFolder}/${f.name}`,
      content: f.content,
    })),
    // Checksum manifest inside the root folder
    {
      name: `${rootFolder}/07_sha256_checksums.txt`,
      content: checksumContent,
    },
  ];

  return createZipArchive(entries);
}
