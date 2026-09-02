/**
 * Secure Media Handler Service
 * 
 * Retrieves media binaries from Meta CDN, enforces SSRF defenses,
 * bounds transfers strictly to 10MB ceiling, and persists privately in Firebase Storage.
 */

import { fetchWithTimeout } from "@/lib/api/fetcher";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import { WhatsAppMetaClient } from "../meta/client";
import { sanitizeFileName } from "../security/sanitizer";
import { adminLogger } from "@/lib/admin/logger";
import { getWhatsAppConfig } from "../config/whatsapp.config";

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10MB hard ceiling
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_HOST_SUFFIXES = [
  ".fbcdn.net",
  ".facebook.com",
  "lookaside.fbsbx.com",
];

export interface ProcessedMediaResult {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export class MediaHandlerService {
  /**
   * Securely downloads media from Meta, validates safety constraints,
   * and saves it privately to Firebase Storage.
   */
  public static async processInboundMedia(
    mediaId: string,
    threadPhone: string,
    declaredMimeType?: string,
    originalFileName?: string
  ): Promise<ProcessedMediaResult> {
    const config = getWhatsAppConfig();

    // 1. Retrieve temporary download URL from Meta
    const metadata = await WhatsAppMetaClient.getMediaMetadata(mediaId);
    if (!metadata.url) {
      throw new Error(`Meta media object ${mediaId} returned no download URL`);
    }

    // 2. SSRF Protection: Verify URL domain belongs to Meta CDN
    const parsedUrl = new URL(metadata.url);
    const hostname = parsedUrl.hostname.toLowerCase();

    const isAllowedHost = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(suffix)
    );

    if (!isAllowedHost) {
      adminLogger.error("WhatsApp:SSRFBlocked", new Error("SSRF attempt blocked"), "Media download URL does not match Meta CDN hosts", { hostname });
      throw new Error(`Blocked potentially malicious media hostname: ${hostname}`);
    }

    // 3. Block loopback, private, and internal addresses
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.")
    ) {
      adminLogger.error("WhatsApp:SSRFBlocked", new Error("Private host blocked"), "Media URL resolved to internal/private host", { hostname });
      throw new Error("Internal or loopback media downloads are prohibited");
    }

    // 4. Download media with bounded byte-limit pipeline
    const response = await fetchWithTimeout(
      metadata.url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      },
      6000
    );

    if (!response.ok) {
      throw new Error(`Failed to download media binary from Meta CDN: HTTP ${response.status}`);
    }

    // Check declared Content-Length header
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_MEDIA_BYTES) {
      adminLogger.warn("WhatsApp:MediaTooLarge", "Media declared Content-Length exceeds 10MB limit", { contentLength });
      throw new Error("Media attachment exceeds 10MB ceiling");
    }

    // Read bounded buffer safely
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_MEDIA_BYTES) {
      adminLogger.warn("WhatsApp:MediaTooLarge", "Downloaded media buffer exceeds 10MB limit", {
        size: arrayBuffer.byteLength,
      });
      throw new Error("Media attachment exceeds 10MB ceiling");
    }

    const buffer = Buffer.from(arrayBuffer);

    // 5. Validate MIME type
    const mimeType = declaredMimeType || metadata.mime_type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      adminLogger.warn("WhatsApp:MimeRejected", "Rejected unapproved media MIME type", { mimeType });
      throw new Error(`Unsupported attachment MIME type: ${mimeType}`);
    }

    // 6. Generate secure private storage destination
    const cleanThreadId = threadPhone.replace(/[^0-9]/g, "");
    const safeName = sanitizeFileName(originalFileName || "recruiter_document.pdf");
    const storagePath = `whatsapp_media/${cleanThreadId}/${safeName}`;

    // 7. Save to Firebase Storage privately (isPublic: false)
    await storageDataSource.uploadBuffer(storagePath, buffer, {
      contentType: mimeType,
      isPublic: false, // Strict Private Storage Invariant
      metadata: {
        recruiterPhone: threadPhone,
        mediaId,
        originalFileName: originalFileName || safeName,
      },
    });

    return {
      storagePath,
      mimeType,
      sizeBytes: buffer.length,
      fileName: originalFileName || safeName,
    };
  }
}
