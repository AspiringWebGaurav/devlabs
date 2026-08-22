export const VISITOR_COOKIE_NAME = "vst_id";
export const BAN_COOKIE_NAME = "vst_ban_state";
export const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

const SIGNING_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "gps-visitor-secure-signing-master-secret-2026";

/**
 * Universal cryptographically secure random bytes (Edge + Node compatible).
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Generates a cryptographically random Visitor ID with vst_ prefix.
 * Example: vst_9X2A8KLMQ4P7
 */
export function generateVisitorId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Base32 unambiguous charset
  const randomBytes = getRandomBytes(12);
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[randomBytes[i] % chars.length];
  }
  return `vst_${id}`;
}

// Universal Pure SHA-256 implementation for synchronous Edge Middleware HMAC
function sha256Sync(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const newLen = (((len + 8) >> 6) << 6) + 64;
  const padded = new Uint8Array(newLen);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLen, false);

  const w = new Uint32Array(64);

  for (let i = 0; i < newLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 =
        ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^
        ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^
        (w[j - 15] >>> 3);
      const s1 =
        ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^
        ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^
        (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 =
        ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256Sync(key: string, message: string): string {
  const enc = new TextEncoder();
  const rawKeyBytes = enc.encode(key);
  const keyBytes = rawKeyBytes.length > 64 ? sha256Sync(rawKeyBytes) : rawKeyBytes;
  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);

  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const msgBytes = enc.encode(message);
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad);
  inner.set(msgBytes, 64);
  const innerHash = sha256Sync(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  const outerHash = sha256Sync(outer);

  // Convert to base64url
  let binary = "";
  for (let i = 0; i < outerHash.length; i++) {
    binary += String.fromCharCode(outerHash[i]);
  }
  if (typeof btoa !== "undefined") {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(outerHash).toString("base64url");
}

export function signVisitorId(visitorId: string): string {
  return hmacSha256Sync(SIGNING_SECRET, visitorId.trim());
}

export function encodeVisitorCookieValue(visitorId: string): string {
  const cleanId = visitorId.trim();
  const signature = signVisitorId(cleanId);
  return `${cleanId}.${signature}`;
}

export function decodeAndVerifyVisitorCookie(cookieValue: string | undefined | null): string | null {
  if (!cookieValue || typeof cookieValue !== "string") return null;

  let raw = cookieValue.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Keep raw
  }

  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [visitorId, signature] = parts;
  if (!visitorId || !visitorId.startsWith("vst_") || !signature) return null;

  const expectedSignature = signVisitorId(visitorId);
  return expectedSignature === signature ? visitorId : null;
}

interface BanTokenPayload {
  v: string; // visitorId
  r: string; // reason
  t: number; // timestamp
}

/**
 * Universal Base64url encoder/decoder
 */
function toBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64url, "base64url").toString("utf8");
  }
  let base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Generates an encrypted & signed ban token for instant edge enforcement without database roundtrips.
 */
export function signBanToken(visitorId: string, reason = "Access permanently restricted"): string {
  const cleanId = visitorId.trim();
  const obj: BanTokenPayload = {
    v: cleanId,
    r: reason.trim(),
    t: Date.now(),
  };
  const b64Payload = toBase64Url(JSON.stringify(obj));
  const signature = hmacSha256Sync(SIGNING_SECRET, b64Payload);
  return `${b64Payload}.${signature}`;
}

/**
 * Decodes and cryptographically verifies a ban token.
 */
export function verifyBanToken(
  token: string | undefined | null
): { banned: boolean; visitorId?: string; reason?: string; timestamp?: number } | null {
  if (!token || typeof token !== "string") return null;

  const clean = token.trim();
  const parts = clean.split(".");
  if (parts.length !== 2) return null;

  const [b64Payload, signature] = parts;
  if (!b64Payload || !signature) return null;

  const expectedSignature = hmacSha256Sync(SIGNING_SECRET, b64Payload);
  if (expectedSignature !== signature) return null;

  try {
    const jsonStr = fromBase64Url(b64Payload);
    const parsed: BanTokenPayload = JSON.parse(jsonStr);
    if (!parsed || !parsed.v || !parsed.v.startsWith("vst_")) return null;

    return {
      banned: true,
      visitorId: parsed.v,
      reason: parsed.r || "Access permanently restricted by administrator",
      timestamp: parsed.t,
    };
  } catch {
    return null;
  }
}
