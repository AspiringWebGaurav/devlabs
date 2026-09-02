/**
 * Authenticated Admin Media Proxy Route Handler
 * 
 * Safely serves private Firebase Storage recruiter attachments
 * strictly to authenticated admins. Recruiter attachments are never public.
 */

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
): Promise<Response> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  // 1. Verify Admin Session Token
  const session = await verifyAdminSession(sessionToken);
  if (!session) {
    adminLogger.warn("WhatsApp:MediaProxyUnauthorized", "Unauthenticated access attempt to private media");
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileId } = await context.params;
  if (!fileId) {
    return new Response("Bad Request: Missing file identifier", { status: 400 });
  }

  // 2. Decode storage path safely (supporting base64 or URL encoding)
  let storagePath: string;
  try {
    if (fileId.startsWith("whatsapp_media")) {
      storagePath = decodeURIComponent(fileId);
    } else {
      // Decode Base64URL
      const base64 = fileId.replace(/-/g, "+").replace(/_/g, "/");
      storagePath = Buffer.from(base64, "base64").toString("utf-8");
    }
  } catch {
    return new Response("Bad Request: Malformed file identifier", { status: 400 });
  }

  // 3. Security Boundary: Strictly enforce whatsapp_media prefix and reject traversal
  if (!storagePath.startsWith("whatsapp_media/") || storagePath.includes("..")) {
    adminLogger.warn("WhatsApp:MediaProxyTraversalBlocked", "Blocked path traversal attempt in media proxy", {
      attemptedPath: storagePath,
    });
    return new Response("Forbidden: Invalid storage path", { status: 403 });
  }

  // 4. Download file buffer via DAL
  try {
    const fileData = await storageDataSource.getFileBuffer(storagePath);
    if (!fileData) {
      return new Response("Not Found", { status: 404 });
    }

    const fileName = storagePath.split("/").pop() || "recruiter_document";

    return new Response(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": fileData.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    adminLogger.error("WhatsApp:MediaProxyError", err, "Failed to stream media file to admin");
    return new Response("Internal Server Error", { status: 500 });
  }
}
