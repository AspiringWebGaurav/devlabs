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

export function SwitchyProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");

    // Condition: Exclude Admin Panel from Switchyy mode overlays
    if (isAdmin) {
      stripSwitchyOverlays();

      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      return;
    }

    // Condition: Public portfolio visitor -> Inject Switchyy SDK asynchronously
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SWITCHY_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [pathname]);

  return null;
}
