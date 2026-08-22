"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaCopy, FaCheck } from "react-icons/fa6";
import { getMachineFingerprint } from "@/lib/visitors/machine-fingerprint";

export const VisitorIdBadge: React.FC = () => {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchVisitorId = useCallback(async () => {
    // 1. Check fast in-memory session cache
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem("portfolio_vst_id");
      if (cached && cached.startsWith("vst_")) {
        setVisitorId(cached);
        return;
      }
    }

    // 2. Fetch authoritative verified visitor ID from server endpoint using machine fingerprint
    try {
      const mfp = await getMachineFingerprint().catch(() => "");
      const url = mfp ? `/api/visitors/me?mfp=${encodeURIComponent(mfp)}` : "/api/visitors/me";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && data.visitorId) {
          setVisitorId(data.visitorId);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("portfolio_vst_id", data.visitorId);
          }
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchVisitorId();

    // 3. Listen for live SSE or Beacon ID broadcast events
    const handleVstEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && customEvent.detail.startsWith("vst_")) {
        setVisitorId(customEvent.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("vst-id-received", handleVstEvent);
      return () => {
        window.removeEventListener("vst-id-received", handleVstEvent);
      };
    }
  }, [fetchVisitorId]);

  const handleCopy = () => {
    if (!visitorId) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(visitorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!visitorId) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy your unique Visitor ID"
      className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200 cursor-pointer select-none text-[11px] font-mono text-neutral-500 hover:text-neutral-300"
    >
      <span className="tracking-tight text-neutral-500 group-hover:text-neutral-400 transition-colors">
        id:
      </span>

      <span className="font-normal text-neutral-400 group-hover:text-neutral-200 transition-colors">
        {visitorId}
      </span>

      <span className="ml-0.5 text-neutral-500 group-hover:text-neutral-300 transition-colors">
        {copied ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <FaCheck className="w-2.5 h-2.5" />
            <span>copied</span>
          </span>
        ) : (
          <FaCopy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80 transition-opacity" />
        )}
      </span>
    </button>
  );
};
