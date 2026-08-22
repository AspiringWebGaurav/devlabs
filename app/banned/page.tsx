"use client";

import React, { useEffect, useState } from "react";
import { FullscreenBanUI } from "@/components/visitor/FullscreenBanUI";

export default function BannedPage() {
  const [visitorId, setVisitorId] = useState<string | undefined>();
  const [banReason, setBanReason] = useState<string | undefined>();
  const [banTimestamp, setBanTimestamp] = useState<number | undefined>();

  useEffect(() => {
    try {
      // 1. Extract visitor ID from vst_id cookie
      const matchId = document.cookie.match(/(?:^|;\s*)vst_id=([^;]+)/);
      if (matchId && matchId[1]) {
        const raw = decodeURIComponent(matchId[1]).split(".")[0];
        if (raw && raw.startsWith("vst_")) {
          setVisitorId(raw);
        }
      }

      // 2. Extract ban reason and timestamp from vst_ban_state cookie (Base64url JSON)
      const matchBan = document.cookie.match(/(?:^|;\s*)vst_ban_state=([^;]+)/);
      if (matchBan && matchBan[1]) {
        const rawToken = decodeURIComponent(matchBan[1]);
        const b64 = rawToken.split(".")[0];
        if (b64) {
          try {
            const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
            const jsonStr = atob(base64);
            const parsed = JSON.parse(jsonStr);
            if (parsed?.r) setBanReason(parsed.r);
            if (parsed?.v && !visitorId) setVisitorId(parsed.v);
            if (parsed?.t) setBanTimestamp(parsed.t);
          } catch {
            // Ignored
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [visitorId]);

  // Guarantee Switchyy overlays or locks never interfere with the Ban Screen
  useEffect(() => {
    const stripSwitchy = () => {
      document.documentElement.classList.remove("switchy-lock");
      document.body?.classList.remove("switchy-lock");
      const overlay = document.getElementById("switchy-overlay");
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      const lock = document.getElementById("switchy-early-lock");
      if (lock && lock.parentNode) lock.parentNode.removeChild(lock);
      const badge = document.getElementById("switchy-debug-badge");
      if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    };
    stripSwitchy();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #switchy-overlay, #switchy-early-lock, #switchy-debug-badge { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }
        .switchy-lock { overflow: auto !important; touch-action: auto !important; overscroll-behavior: auto !important; }
      `}} />
      <FullscreenBanUI
        reason={banReason || "Access permanently revoked by administrator"}
        visitorId={visitorId}
        timestamp={banTimestamp}
      />
    </>
  );
}
