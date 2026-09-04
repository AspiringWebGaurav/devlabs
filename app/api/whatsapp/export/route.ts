/**
 * Dynamic WhatsApp Data Portability Export API Route
 *
 * GET /api/whatsapp/export?phone=...&expires=...&sig=...
 *
 * Validates cryptographic HMAC signature, enforces strict 10-minute link expiration,
 * gracefully handles and explains legacy links, compiles the in-memory PKZip archive
 * inside a root directory, and triggers an instant browser download.
 */

import { NextRequest } from "next/server";
import {
  verifyExportSignature,
  compileExportZipBundle,
  type ExportMessageRecord,
  type ExportSessionData,
} from "@/lib/whatsapp/export/generator";
import { getWhatsAppBaseUrl } from "@/lib/whatsapp/config/whatsapp.config";
import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function renderExpiredHtml(isLegacy: boolean): string {
  const baseUrl = getWhatsAppBaseUrl();
  const title = isLegacy ? "Legacy Export Link Expired" : "Data Export Link Expired";
  const desc = isLegacy
    ? "This export link was issued under an earlier session and has permanently expired. For your privacy and security under GDPR Article 20, data export links are time-limited and strictly expire after <strong>10 minutes</strong>."
    : "This data export link has exceeded its <strong>10-minute security window</strong> and is no longer active. To protect your data portability rights and prevent unauthorized access, export downloads automatically expire after 10 minutes.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | Gaurav Patil Portfolio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000319;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      max-width: 520px;
      width: 100%;
      background: #05081E;
      border: 1px solid rgba(203, 172, 249, 0.25);
      border-radius: 20px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }
    .icon-wrapper {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 10px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-size: 11px;
      font-weight: 600;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    p {
      color: #94A3B8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .instruction-box {
      background: #020412;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 18px 20px;
      text-align: left;
      margin-bottom: 28px;
    }
    .instruction-box h4 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #CBACF9;
      margin-bottom: 10px;
    }
    .instruction-box ol {
      padding-left: 20px;
      color: #E2E8F0;
      font-size: 13.5px;
      line-height: 1.8;
    }
    .instruction-box code {
      background: rgba(203, 172, 249, 0.15);
      color: #CBACF9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #7C3AED;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      border-radius: 10px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #6D28D9;
    }
    .footer {
      margin-top: 24px;
      color: #64748B;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">⏳</div>
    <span class="badge">10-Minute Expiration Security</span>
    <h1>${title}</h1>
    <p>${desc}</p>

    <div class="instruction-box">
      <h4>How to generate a fresh download link</h4>
      <ol>
        <li>Open your WhatsApp conversation with Gaurav</li>
        <li>Type <code>/exportmydata</code> and send</li>
        <li>Tap the new link to download your complete ZIP archive</li>
      </ol>
    </div>

    <a href="${baseUrl}" class="btn">Return to Portfolio &rarr;</a>

    <div class="footer">
      Official Security & Data Portability Gateway &bull; Gaurav Patil Portfolio
    </div>
  </div>
</body>
</html>`;
}

function renderAccessDeniedHtml(): string {
  const baseUrl = getWhatsAppBaseUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Denied | Gaurav Patil Portfolio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000319;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #05081E;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 20px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    h1 { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 10px; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #1E293B;
      color: #F1F5F9;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      border-radius: 10px;
      border: 1px solid #334155;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h1>Access Denied</h1>
    <p>This data export link is invalid, unverified, or has been tampered with. To request an authentic export, send <strong>/exportmydata</strong> in WhatsApp.</p>
    <a href="${baseUrl}" class="btn">Return to Portfolio &rarr;</a>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const phone = searchParams.get("phone")?.replace(/[^0-9]/g, "") || "";
  const sig = searchParams.get("sig")?.trim() || "";
  const expires = searchParams.get("expires")?.trim() || null;

  // 1. Validate Cryptographic HMAC Signature & Strict 10-Minute Expiration Window
  const verification = verifyExportSignature(phone, sig, expires);

  if (verification.expired) {
    adminLogger.warn("WhatsApp:ExportExpired", "Data export link has expired", {
      phone,
      reason: verification.reason,
    });
    return new Response(renderExpiredHtml(verification.reason === "legacy_link_expired"), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!verification.valid) {
    adminLogger.warn("WhatsApp:ExportForbidden", "Invalid or missing HMAC signature for data export", {
      phone,
      reason: verification.reason,
    });
    return new Response(renderAccessDeniedHtml(), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    // 2. Load Session & Messages from Firestore
    let sessionData: ExportSessionData = {
      phone,
      messageCount: 0,
      hasReceivedResume: false,
      inChatMode: false,
      lastActivityAt: Date.now(),
    };
    const messages: ExportMessageRecord[] = [];

    const db = getAdminFirestore();
    if (db) {
      // Load session document
      const sessionDoc = await db.collection("whatsapp_sessions").doc(phone).get();
      if (sessionDoc.exists) {
        const raw = sessionDoc.data() || {};
        sessionData = {
          phone,
          email: raw.email || undefined,
          messageCount: typeof raw.messageCount === "number" ? raw.messageCount : 0,
          hasReceivedResume: Boolean(raw.hasReceivedResume),
          inChatMode: Boolean(raw.inChatMode),
          lastActivityAt: typeof raw.lastActivityAt === "number" ? raw.lastActivityAt : Date.now(),
        };
      }

      // Load messages subcollection ordered by creation time
      const messagesSnapshot = await db
        .collection("whatsapp_sessions")
        .doc(phone)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .get();

      for (const doc of messagesSnapshot.docs) {
        const data = doc.data();
        messages.push({
          id: doc.id,
          sender: data.sender === "assistant" ? "assistant" : "visitor",
          text: data.text || "",
          timestamp: data.timestamp || new Date(data.createdAt || Date.now()).toISOString(),
          createdAt: data.createdAt || Date.now(),
        });
      }
    }

    // 3. Compile in-memory ZIP bundle (enclosed within root folder)
    const expiresNum = expires ? Number(expires) : undefined;
    const zipBuffer = compileExportZipBundle(sessionData, messages, expiresNum);
    const filename = `Gaurav_Patil_Data_Export_${phone}.zip`;

    adminLogger.info("WhatsApp:ExportDispatched", "Data export archive successfully compiled and sent", {
      phone,
      zipSize: zipBuffer.length,
      messageCount: messages.length,
    });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    adminLogger.error("WhatsApp:ExportFailed", err, "Failed to compile export archive");
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#000319;color:#F8FAFC;"><h2>Compilation Error</h2><p style="color:#94A3B8;">Could not package data export at this time. Please try again or contact security@gauravpatil.online.</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
