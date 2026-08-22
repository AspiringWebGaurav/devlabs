import { DeviceInfo, BrowserInfo, DeviceType } from "./types";

/**
 * Parses User-Agent string server-side to detect device OS, type, and architecture.
 */
export function extractDeviceInfo(userAgent: string, headers?: Headers): DeviceInfo {
  const ua = userAgent || "";

  let type: DeviceType = "desktop";
  let os = "Unknown OS";
  let osVersion: string | undefined = undefined;
  let architecture: string | undefined = undefined;

  // 1. Detect Device Type & OS
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    type = "tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile/i.test(ua)) {
    type = "mobile";
  }

  if (/windows/i.test(ua)) {
    os = "Windows";
    if (/windows nt 10.0/i.test(ua)) osVersion = "10 / 11";
    else if (/windows nt 6.3/i.test(ua)) osVersion = "8.1";
    else if (/windows nt 6.1/i.test(ua)) osVersion = "7";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
    const match = ua.match(/mac os x (\d+[._\d]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/android/i.test(ua)) {
    os = "Android";
    const match = ua.match(/android (\d+[._\d]*)/i);
    if (match) osVersion = match[1];
  } else if (/iphone/i.test(ua)) {
    os = "iOS";
    const match = ua.match(/os (\d+[._\d]*)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/ipad/i.test(ua)) {
    os = "iPadOS";
    const match = ua.match(/os (\d+[._\d]*)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  // 2. Detect Architecture
  if (/x86_64|win64|x64|amd64|wow64/i.test(ua)) {
    architecture = "x64";
  } else if (/arm64|aarch64|apple m\d|armv\d/i.test(ua)) {
    architecture = "ARM64";
  } else if (/i686|i386|x86/i.test(ua)) {
    architecture = "x86";
  }

  // Optional: check client hints
  if (headers) {
    const hintArch = headers.get("sec-ch-ua-arch");
    if (hintArch) architecture = hintArch.replace(/"/g, "");

    const hintPlatform = headers.get("sec-ch-ua-platform");
    if (hintPlatform) os = hintPlatform.replace(/"/g, "");
  }

  return {
    type,
    os,
    osVersion,
    architecture,
  };
}

/**
 * Parses User-Agent string server-side to detect browser name and major version.
 */
export function extractBrowserInfo(userAgent: string, headers?: Headers): BrowserInfo {
  const ua = userAgent || "";
  let name = "Unknown Browser";
  let version: string | undefined = undefined;

  // Check client hints if present
  if (headers) {
    const chUa = headers.get("sec-ch-ua");
    if (chUa) {
      if (chUa.includes("Edge") || chUa.includes("Edg")) name = "Edge";
      else if (chUa.includes("Brave")) name = "Brave";
      else if (chUa.includes("Opera") || chUa.includes("OPR")) name = "Opera";
      else if (chUa.includes("Chrome") || chUa.includes("Google Chrome")) name = "Chrome";
      else if (chUa.includes("Firefox")) name = "Firefox";
    }
  }

  if (name === "Unknown Browser") {
    if (/edg\//i.test(ua)) {
      name = "Edge";
      version = ua.match(/edg\/([\d.]+)/i)?.[1];
    } else if (/opr\/|opera/i.test(ua)) {
      name = "Opera";
      version = ua.match(/(?:opr|opera)\/([\d.]+)/i)?.[1];
    } else if (/brave/i.test(ua)) {
      name = "Brave";
    } else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
      name = "Chrome";
      version = ua.match(/(?:chrome|crios)\/([\d.]+)/i)?.[1];
    } else if (/firefox|fxios/i.test(ua)) {
      name = "Firefox";
      version = ua.match(/(?:firefox|fxios)\/([\d.]+)/i)?.[1];
    } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
      name = "Safari";
      version = ua.match(/version\/([\d.]+)/i)?.[1];
    }
  }

  return {
    name,
    version,
  };
}
