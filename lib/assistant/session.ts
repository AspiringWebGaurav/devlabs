/**
 * Live Chat Route Handler Guard & Session Extractor
 *
 * Implements server-side session extraction, server-authoritative revocation checks,
 * CSRF origin validation, and trusted client IP extraction.
 */

import { NextRequest } from "next/server";
import {
  LIVE_CHAT_COOKIE_NAME,
  verifyVisitorSession,
  VisitorSession,
} from "./auth";
import { liveChatSessionsRepository } from "@/lib/dal/repositories/live-chat-sessions.repository";
import crypto from "crypto";

export interface AuthenticatedVisitorContext {
  session: VisitorSession;
  sessionId: string;
  email: string;
  name: string;
}

/**
 * Extracts and authoritatively verifies the visitor session from the request cookie and Firestore registry.
 */
export async function getAuthenticatedVisitor(
  req: NextRequest
): Promise<AuthenticatedVisitorContext | null> {
  const cookie = req.cookies.get(LIVE_CHAT_COOKIE_NAME);
  if (!cookie?.value) return null;

  // 1. Cryptographic token verification
  const session = verifyVisitorSession(cookie.value);
  if (!session) return null;

  // 2. Server-Authoritative Session Registry Check in Firestore
  const dbSession = await liveChatSessionsRepository.getSession(session.sessionId);
  if (!dbSession) return null;

  const now = Date.now();
  if (dbSession.status !== "ACTIVE" || now >= dbSession.expiresAt) {
    return null;
  }

  // Ensure email matches
  if (dbSession.email.toLowerCase() !== session.email.toLowerCase()) {
    return null;
  }

  return {
    session,
    sessionId: session.sessionId,
    email: session.email,
    name: session.name,
  };
}

/**
 * Extracts client IP safely behind trusted reverse proxies (Vercel / Cloudflare).
 */
export function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Left-most IP is the original client IP
    const clientIp = forwarded.split(",")[0].trim();
    if (clientIp) return clientIp;
  }

  const realIp = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Validates request Origin against authorized production, preview, and local development origins.
 */
export function validateCsrfOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Missing origin on browser state-changing POST/DELETE is rejected
    return false;
  }

  const cleanOrigin = origin.trim().toLowerCase();

  // 1. Canonical Production Domain
  if (cleanOrigin === "https://gauravpatil.online") return true;

  // 2. Local Development
  if (
    cleanOrigin === "http://localhost:3000" ||
    cleanOrigin === "http://127.0.0.1:3000"
  ) {
    return true;
  }

  // 3. Vercel Preview Deployment Hostname Pattern
  const previewRegex = /^https:\/\/(devlabs|gaurav-portfolio)-[a-z0-9-]+-aspiringwebgauravs-projects\.vercel\.app$/;
  if (previewRegex.test(cleanOrigin)) return true;

  // 4. Custom App URL override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
    if (cleanOrigin === configuredUrl) return true;
  }

  return false;
}

/**
 * Checks M2M Cron authorization using constant-time secret comparison.
 */
export function validateCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || "default_cron_secret_for_local_testing";
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const suppliedToken = match[1].trim();

  try {
    const bufA = Buffer.from(suppliedToken);
    const bufB = Buffer.from(cronSecret);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Checks if the Live Chat subsystem is enabled via environment variable.
 */
export function isLiveChatEnabled(): boolean {
  return process.env.LIVE_CHAT_ENABLED !== "false";
}
