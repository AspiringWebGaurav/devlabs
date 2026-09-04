/**
 * Dynamic WhatsApp Data Portability Export API Route
 *
 * GET /api/whatsapp/export?phone=...&sig=...
 *
 * Validates cryptographic HMAC signature, loads visitor conversation data,
 * compiles an in-memory PKZip archive (HTML transcript, JSON data, GDPR certificate),
 * and triggers an instant browser download.
 */

import { NextRequest } from "next/server";
import {
  verifyExportSignature,
  compileExportZipBundle,
  type ExportMessageRecord,
  type ExportSessionData,
} from "@/lib/whatsapp/export/generator";
import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const phone = searchParams.get("phone")?.replace(/[^0-9]/g, "") || "";
  const sig = searchParams.get("sig")?.trim() || "";

  // 1. Validate Cryptographic HMAC Signature
  const isValid = verifyExportSignature(phone, sig);
  if (!isValid) {
    adminLogger.warn("WhatsApp:ExportForbidden", "Invalid or missing HMAC signature for data export", { phone });
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#000319;color:#F8FAFC;"><h2>Access Denied</h2><p style="color:#94A3B8;">This data export link is invalid, expired, or tampered with.</p></body></html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  try {
    // 2. Load Session & Messages from Firestore
    let sessionData: ExportSessionData = {
      phone,
      messageCount: 0,
      hasReceivedResume: false,
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

    // 3. Compile in-memory ZIP bundle
    const zipBuffer = compileExportZipBundle(sessionData, messages);
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
