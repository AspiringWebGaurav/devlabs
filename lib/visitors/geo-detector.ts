import { GeoLocation } from "./types";

/**
 * Extracts GeoLocation information strictly from server request headers.
 * Never requests browser GPS permission.
 */
export function extractGeoFromHeaders(headers: Headers): GeoLocation {
  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country") ||
    (process.env.NODE_ENV === "development" ? "IN" : "Unknown");

  const state =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("cf-region") ||
    headers.get("x-region") ||
    (process.env.NODE_ENV === "development" ? "Maharashtra" : "Unknown");

  const city =
    headers.get("x-vercel-ip-city") ||
    headers.get("cf-ipcity") ||
    headers.get("x-city") ||
    (process.env.NODE_ENV === "development" ? "Mumbai" : "Unknown");

  const region = headers.get("x-vercel-ip-country-region") || undefined;

  const latHeader = headers.get("x-vercel-ip-latitude");
  const lngHeader = headers.get("x-vercel-ip-longitude");
  const latitude = latHeader ? parseFloat(latHeader) : undefined;
  const longitude = lngHeader ? parseFloat(lngHeader) : undefined;

  const asn = headers.get("x-vercel-ip-as-number") || headers.get("cf-ray") || undefined;
  const isp = headers.get("x-vercel-ip-as-name") || undefined;

  return {
    country,
    state,
    city,
    region,
    latitude: isNaN(latitude as number) ? undefined : latitude,
    longitude: isNaN(longitude as number) ? undefined : longitude,
    isp,
    asn,
  };
}

/**
 * Extracts the client's public IP address from proxy headers.
 */
export function extractClientIP(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIP =
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip");

  if (realIP) return realIP.trim();

  return process.env.NODE_ENV === "development" ? "127.0.0.1" : "Unknown IP";
}
