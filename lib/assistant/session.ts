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
import {
  liveChatSessionsRepository,
  type LiveChatSessionDocument,
} from "@/lib/dal/repositories/live-chat-sessions.repository";
import crypto from "crypto";

export interface AuthenticatedVisitorContext {
  session: VisitorSession;
  sessionId: string;
  email: string;
  name: string;
}

interface CachedVisitorSession {
  dbSession: LiveChatSessionDocument;
  cachedUntil: number;
}

const visitorSessionCache = new Map<string, CachedVisitorSession>();
const VISITOR_SESSION_CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Invalidates a visitor session from the local L1 memory cache upon signout or revocation.
 */
export function invalidateVisitorSessionCache(sessionId: string): void {
  visitorSessionCache.delete(sessionId);
}

/**
 * Extracts and authoritatively verifies the visitor session from the request cookie and Firestore registry.
 * Utilizes a high-performance 30-second in-memory L1 cache to avoid redundant database reads during active chat polling.
 */
export async function getAuthenticatedVisitor(
  req: NextRequest
): Promise<AuthenticatedVisitorContext | null> {
  const cookie = req.cookies.get(LIVE_CHAT_COOKIE_NAME);
  if (!cookie?.value) return null;

  // 1. Cryptographic token verification
  const session = verifyVisitorSession(cookie.value);
  if (!session) return null;

  // 2. Server-Authoritative Session Registry Check (In-Memory L1 Cache + Firestore)
  const now = Date.now();
  let dbSession: LiveChatSessionDocument | null = null;
  const cached = visitorSessionCache.get(session.sessionId);

  if (cached && now < cached.cachedUntil) {
    dbSession = cached.dbSession;
  } else {
    dbSession = await liveChatSessionsRepository.getSession(session.sessionId);
    if (dbSession) {
      if (visitorSessionCache.size > 500) {
        visitorSessionCache.clear();
      }
      visitorSessionCache.set(session.sessionId, {
        dbSession,
        cachedUntil: Math.min(now + VISITOR_SESSION_CACHE_TTL_MS, dbSession.expiresAt),
      });
    }
  }

  if (!dbSession) return null;

  if (dbSession.status !== "ACTIVE" || now >= dbSession.expiresAt) {
    visitorSessionCache.delete(session.sessionId);
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
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) {
    // Missing origin/referer on browser state-changing POST/DELETE is rejected
    return false;
  }

  let cleanOrigin: string;
  try {
    cleanOrigin = new URL(origin).origin.toLowerCase();
  } catch {
    cleanOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
  }

  // 1. Same-Origin Check (Matches incoming Next.js request origin directly)
  if (req.nextUrl?.origin && cleanOrigin === req.nextUrl.origin.toLowerCase()) {
    return true;
  }

  // 2. Host / X-Forwarded-Host Header Match
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    if (cleanOrigin === `${proto}://${host}`.toLowerCase()) return true;
  }

  // 3. All Vercel Deployments (*.vercel.app)
  if (cleanOrigin.endsWith(".vercel.app") && cleanOrigin.startsWith("https://")) {
    return true;
  }

  // 4. Canonical Production & Supported Custom Domains
  const trustedDomains = [
    "https://devlabs.eu.cc",
    "https://www.devlabs.eu.cc",
    "https://gauravpatil.online",
    "https://www.gauravpatil.online",
    "https://gauravservices.eu.cc",
    "https://www.gauravservices.eu.cc",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  if (trustedDomains.includes(cleanOrigin)) return true;

  // 5. Allow any localhost / 127.0.0.1 port in development
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
    return true;
  }

  // 6. Environment Variable Overrides
  const envUrls = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
  ].filter(Boolean) as string[];

  for (const envUrl of envUrls) {
    try {
      const parsedEnvOrigin = new URL(envUrl).origin.toLowerCase();
      if (cleanOrigin === parsedEnvOrigin) return true;
    } catch {
      if (cleanOrigin === envUrl.trim().toLowerCase().replace(/\/$/, "")) return true;
    }
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
