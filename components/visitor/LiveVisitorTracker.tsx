"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getMachineFingerprint } from "@/lib/visitors/machine-fingerprint";

export const LiveVisitorTracker: React.FC = () => {
  const pathname = usePathname();
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasSentViewportRef = useRef(false);
  const machineHashRef = useRef<string>("");

  // Skip tracking for admin panel routes and banned lockout page
  const isAdminRoute = pathname.startsWith("/admin");
  const isBannedRoute = pathname === "/banned";

  // 1. Establish Server-Sent Events (SSE) Live Connection with Machine Fingerprint
  useEffect(() => {
    if (isAdminRoute || isBannedRoute) return;

    let isMounted = true;

    const setupConnection = async () => {
      // Compute machine fingerprint in < 15ms non-blocking
      const mfp = await getMachineFingerprint().catch(() => "");
      if (isMounted && mfp) {
        machineHashRef.current = mfp;
      }

      if (!isMounted) return;

      const cachedSes =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("portfolio_ses_id")
          : null;

      const params = new URLSearchParams();
      params.set("path", pathname);
      if (mfp) params.set("mfp", mfp);
      if (cachedSes && cachedSes.startsWith("ses_")) params.set("ses", cachedSes);

      const streamUrl = `/api/visitors/stream?${params.toString()}`;

      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "CONNECTED") {
            if (typeof window !== "undefined") {
              if (data.visitorId) {
                window.sessionStorage.setItem("portfolio_vst_id", data.visitorId);
                window.dispatchEvent(new CustomEvent("vst-id-received", { detail: data.visitorId }));
              }
              if (data.sessionId) {
                window.sessionStorage.setItem("portfolio_ses_id", data.sessionId);
              }
            }
          } else if (data.type === "BAN") {
            // Store signed ban token in cookie
            if (data.banToken && typeof document !== "undefined") {
              document.cookie = `vst_ban_state=${data.banToken}; Path=/; Max-Age=31536000; SameSite=Lax`;
            }
            // Perform clean hard transition to /banned with zero DOM glitches
            if (typeof window !== "undefined" && window.location.pathname !== "/banned") {
              window.location.replace("/banned");
            }
          } else if (data.type === "UNBAN") {
            // Wipe ban cookie
            if (typeof document !== "undefined") {
              document.cookie = "vst_ban_state=; Path=/; Max-Age=0; SameSite=Lax";
            }
            // Redirect to portfolio if currently on /banned
            if (typeof window !== "undefined" && window.location.pathname === "/banned") {
              window.location.replace("/");
            }
          }
        } catch {
          // Ignored
        }
      };

      es.onerror = () => {
        // Reconnect handled automatically by native EventSource
      };
    };

    setupConnection();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAdminRoute, isBannedRoute, pathname]);

  // 2. Send Post-Hydration Viewport & Route Beacon
  useEffect(() => {
    if (isAdminRoute || isBannedRoute) return;

    const sendBeacon = async () => {
      const isTouch =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0);

      const isDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        colorScheme: isDark ? ("dark" as const) : ("light" as const),
        touch: isTouch,
      };

      const mfp = machineHashRef.current || (await getMachineFingerprint().catch(() => ""));

      const payload: {
        currentPath: string;
        referrer?: string;
        viewport?: typeof viewport;
        machineHash?: string;
      } = {
        currentPath: pathname,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        machineHash: mfp || undefined,
      };

      // Send viewport only once per page load, otherwise just path
      if (!hasSentViewportRef.current) {
        payload.viewport = viewport;
        hasSentViewportRef.current = true;
      }

      fetch("/api/visitors/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => (r.ok ? r.json().catch(() => null) : null))
        .then((res) => {
          if (res && res.banned) {
            if (typeof window !== "undefined" && window.location.pathname !== "/banned") {
              window.location.replace("/banned");
            }
            return;
          }
          if (res && res.visitorId && typeof window !== "undefined") {
            window.sessionStorage.setItem("portfolio_vst_id", res.visitorId);
            window.dispatchEvent(new CustomEvent("vst-id-received", { detail: res.visitorId }));
          }
        })
        .catch(() => {});
    };

    sendBeacon();
  }, [pathname, isAdminRoute, isBannedRoute]);

  return null;
};
