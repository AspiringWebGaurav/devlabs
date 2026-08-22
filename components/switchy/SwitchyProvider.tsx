"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SWITCHY_SRC =
  "https://switchyy.eu.cc/switchy.js?key=pk_b7e7e931a4aec9eb3be85b8f&project=evzKtYqTJ5jwTdS6LryX";
const SCRIPT_ID = "switchy-sdk-script";

function stripSwitchyOverlays() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("switchy-lock");
  document.body?.classList.remove("switchy-lock");

  const overlay = document.getElementById("switchy-overlay");
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

  const lock = document.getElementById("switchy-early-lock");
  if (lock && lock.parentNode) lock.parentNode.removeChild(lock);

  const badge = document.getElementById("switchy-debug-badge");
  if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
}

function isVisitorBanned(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const match = document.cookie.match(/(?:^|;\s*)vst_ban_state=([^;]+)/);
    return Boolean(match && match[1] && match[1].length > 5);
  } catch {
    return false;
  }
}

export function SwitchyProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isBannedRoute = pathname === "/banned";
    const banned = isVisitorBanned();

    // Condition: Exclude Admin Panel and Banned Visitors from Switchyy mode overlays
    if (isAdmin || isBannedRoute || banned) {
      stripSwitchyOverlays();

      // Remove script if present when entering protected/banned territory
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      return;
    }

    // Condition: Public unbanned portfolio visitor -> Inject Switchyy SDK
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SWITCHY_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [pathname]);

  return null;
}
