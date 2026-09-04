/**
 * WhatsApp Data Export Bundle Compiler & Crypto Signer
 *
 * Implements GDPR Article 20 & CCPA Data Portability requirements:
 * - Cryptographic HMAC-SHA256 URL signing
 * - Self-contained, responsive Dark Luxury offline HTML transcript
 * - Structured JSON conversation history
 * - Official Data Portability Compliance Certificate
 */

import crypto from "crypto";
import { createZipArchive, type ZipFileEntry } from "./zip";

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
  lastActivityAt: number;
}

/**
 * Creates an HMAC-SHA256 signature specifically for WhatsApp data export downloads.
 */
export function createExportSignature(phone: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "wa_export_data_secret_key";
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return crypto.createHmac("sha256", secret).update(`export:${cleanPhone}`).digest("hex");
}

/**
 * Verifies the export signature against the phone number.
 */
export function verifyExportSignature(phone: string, signature: string): boolean {
  if (!phone || !signature) return false;
  const expected = createExportSignature(phone);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Compiles an official GDPR Article 20 Data Portability text certificate.
 */
export function generateReadmeCertificate(session: ExportSessionData): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const exportDate = new Date().toISOString();
  const exportDateIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return (
    `=======================================================================\n` +
    `GAURAV PATIL PORTFOLIO — OFFICIAL DATA PORTABILITY CERTIFICATE\n` +
    `Compliance Standard: GDPR Article 20 (Right to Data Portability) & CCPA\n` +
    `=======================================================================\n\n` +
    `DATA CONTROLLER INFORMATION:\n` +
    `-----------------------------------------------------------------------\n` +
    `Data Controller:    Gaurav Patil (Full-Stack Engineer & System Architect)\n` +
    `Official Website:   https://www.gauravpatil.online\n` +
    `Security Contact:   security@gauravpatil.online\n` +
    `Legal Channel:      hello@gauravpatil.online\n\n` +
    `DATA SUBJECT DETAILS:\n` +
    `-----------------------------------------------------------------------\n` +
    `WhatsApp Number:    +${cleanPhone}\n` +
    `Registered Email:   ${session.email || "Not Provided"}\n` +
    `Resume Delivered:   ${session.hasReceivedResume ? "Yes" : "No"}\n` +
    `Total Inquiries:    ${session.messageCount} of 3 maximum per session\n` +
    `Export Time (UTC):  ${exportDate}\n` +
    `Export Time (IST):  ${exportDateIST} (IST)\n\n` +
    `LEGAL BASIS & PURPOSE OF PROCESSING:\n` +
    `-----------------------------------------------------------------------\n` +
    `1. Purpose: Direct professional communication, recruiter inquiries, and\n` +
    `   portfolio introductions via official Meta WhatsApp Cloud API.\n` +
    `2. Lawful Basis: Explicit consent and legitimate interest (GDPR Art. 6(1)(a)(f)).\n` +
    `3. Data Retention: Session records are cached ephemerally for conversation\n` +
    `   continuity and rate limiting.\n\n` +
    `YOUR DATA PRIVACY RIGHTS:\n` +
    `-----------------------------------------------------------------------\n` +
    `• Right to Erasure (Right to be Forgotten):\n` +
    `  You may permanently erase your entire session and messages from our database\n` +
    `  at any time by replying "STOP" directly in your WhatsApp conversation.\n` +
    `• Right to Rectification:\n` +
    `  You can update your registered email anytime in WhatsApp or by contacting\n` +
    `  security@gauravpatil.online.\n\n` +
    `FILES INCLUDED IN THIS ARCHIVE:\n` +
    `-----------------------------------------------------------------------\n` +
    `01_README_Data_Portability_Certificate.txt  -> This official disclosure\n` +
    `02_chat_transcript.html                     -> Visual, offline-viewable chat transcript\n` +
    `03_conversation_history.json                -> Machine-readable structured export\n\n` +
    `=======================================================================\n` +
    `Generated cryptographically on-demand by Gaurav Patil Portfolio Gateway.\n` +
    `=======================================================================\n`
  );
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
 * Generates an offline-viewable, standalone Dark Luxury HTML chat transcript.
 */
export function generateHtmlTranscript(
  session: ExportSessionData,
  messages: ExportMessageRecord[]
): string {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");
  const exportTimeIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const messageRowsHtml =
    messages.length === 0
      ? `<div class="empty-state">No chat messages recorded in this session.</div>`
      : messages
          .map((msg) => {
            const isVisitor = msg.sender === "visitor";
            const safeContent = escapeHtml(msg.text).replace(/\n/g, "<br/>");
            return `
              <div class="message-row ${isVisitor ? "visitor" : "assistant"}">
                <div class="bubble">
                  <div class="meta">
                    <span class="sender-name">${isVisitor ? "You (Visitor)" : "Gaurav's Assistant"}</span>
                    <span class="time">${escapeHtml(msg.timestamp)}</span>
                  </div>
                  <div class="content">${safeContent}</div>
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
      max-width: 680px;
      margin: 0 auto;
      background: #05081E;
      border: 1px solid rgba(203, 172, 249, 0.2);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }
    .header {
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(203, 172, 249, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
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
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .subtitle {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
    }
    .message-row.visitor .bubble {
      background: #059669;
      color: #FFFFFF;
      border-bottom-right-radius: 2px;
    }
    .message-row.assistant .bubble {
      background: #1E293B;
      color: #F1F5F9;
      border: 1px solid #334155;
      border-bottom-left-radius: 2px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 10.5px;
      margin-bottom: 4px;
      opacity: 0.85;
    }
    .sender-name { font-weight: 600; }
    .content { word-break: break-word; line-height: 1.45; }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #64748B;
      font-size: 13px;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-row">
        <div class="brand">
          <h1>Gaurav Patil &bull; WhatsApp Transcript</h1>
        </div>
        <span class="badge">Verified Export</span>
      </div>
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
          <span>Export Time</span>
          <strong>${exportTimeIST}</strong>
        </div>
      </div>
    </div>

    <div class="chat-area">
      ${messageRowsHtml}
    </div>

    <div class="footer">
      Official Portfolio Communication &bull; <a href="https://www.gauravpatil.online" target="_blank" rel="noopener noreferrer">gauravpatil.online</a> &bull; Data Controller: Gaurav Patil
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates the complete PKZip Buffer ready to be streamed to the client.
 */
export function compileExportZipBundle(
  session: ExportSessionData,
  messages: ExportMessageRecord[]
): Buffer {
  const cleanPhone = session.phone.replace(/[^0-9]/g, "");

  const readmeContent = generateReadmeCertificate(session);
  const htmlContent = generateHtmlTranscript(session, messages);
  const jsonContent = JSON.stringify(
    {
      exportType: "GAURAV_PATIL_PORTFOLIO_WHATSAPP_DATA_EXPORT",
      version: "1.0",
      compliance: "GDPR_ARTICLE_20_DATA_PORTABILITY",
      exportedAtUTC: new Date().toISOString(),
      subject: {
        phone: `+${cleanPhone}`,
        email: session.email || null,
        messageCount: session.messageCount,
        hasReceivedResume: session.hasReceivedResume,
        lastActivityAt: session.lastActivityAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestampIST: m.timestamp,
        createdAtUnixMs: m.createdAt,
      })),
    },
    null,
    2
  );

  const entries: ZipFileEntry[] = [
    { name: "01_README_Data_Portability_Certificate.txt", content: readmeContent },
    { name: "02_chat_transcript.html", content: htmlContent },
    { name: "03_conversation_history.json", content: jsonContent },
  ];

  return createZipArchive(entries);
}
