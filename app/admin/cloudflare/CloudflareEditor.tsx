"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CloudflareSettingsDocument } from "@/types/portfolio";
import { updateCloudflareAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import {
  FaCheck,
  FaRotateRight,
  FaFloppyDisk,
  FaShieldHalved,
  FaTriangleExclamation,
  FaBolt,
  FaArrowUpRightFromSquare,
  FaEnvelope,
  FaKey,
} from "react-icons/fa6";

export const CloudflareEditor: React.FC<{ initialData: CloudflareSettingsDocument | null }> = ({ initialData }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    isSimulatedDowntime: initialData?.isSimulatedDowntime === true,
    siteKey: initialData?.siteKey || "0x4AAAAAAEilFWDvwBZ3NPSK",
    maxRetryAttempts: initialData?.maxRetryAttempts || 2,
    circuitBreakerEnabled: initialData?.circuitBreakerEnabled !== false,
    fallbackEmailGateway: initialData?.fallbackEmailGateway || "no-reply@gauravpatil.online",
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    if (initialData) {
      setFormData({
        isSimulatedDowntime: initialData.isSimulatedDowntime === true,
        siteKey: initialData.siteKey || "0x4AAAAAAEilFWDvwBZ3NPSK",
        maxRetryAttempts: initialData.maxRetryAttempts || 2,
        circuitBreakerEnabled: initialData.circuitBreakerEnabled !== false,
        fallbackEmailGateway: initialData.fallbackEmailGateway || "no-reply@gauravpatil.online",
      });
    }
  }, [initialData]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "cloudflare" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const payload = {
      isSimulatedDowntime: formData.isSimulatedDowntime,
      siteKey: formData.siteKey.trim() || "0x4AAAAAAEilFWDvwBZ3NPSK",
      maxRetryAttempts: Number(formData.maxRetryAttempts) || 2,
      circuitBreakerEnabled: formData.circuitBreakerEnabled,
      fallbackEmailGateway: formData.fallbackEmailGateway.trim() || "no-reply@gauravpatil.online",
      expectedVersion: initialData?.version,
    };

    const res = await updateCloudflareAction(payload);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("cloudflare", (res.data as CloudflareSettingsDocument | undefined)?.version);
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({
        type: "success",
        text: `Cloudflare security settings saved! Downtime simulation is now ${formData.isSimulatedDowntime ? "ACTIVE (Simulating Outage)" : "DISABLED (Normal Protection)"}.`,
      });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update Cloudflare settings." });
    }
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({
        isSimulatedDowntime: initialData.isSimulatedDowntime === true,
        siteKey: initialData.siteKey || "0x4AAAAAAEilFWDvwBZ3NPSK",
        maxRetryAttempts: initialData.maxRetryAttempts || 2,
        circuitBreakerEnabled: initialData.circuitBreakerEnabled !== false,
        fallbackEmailGateway: initialData.fallbackEmailGateway || "no-reply@gauravpatil.online",
      });
    }
    setStatusMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-sm border text-xs font-admin-mono flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <FaCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            ) : (
              <FaTriangleExclamation className="w-4 h-4 text-[#DC2626] shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-semibold underline hover:opacity-75 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Admin Freedom Card: Cloudflare Downtime Simulation */}
      <div className={`p-6 rounded-sm border transition-all ${
        formData.isSimulatedDowntime
          ? "bg-[#FFF7ED] border-[#FDBA74] shadow-xs"
          : "bg-white border-[#E2E8F0]"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                formData.isSimulatedDowntime
                  ? "bg-[#EA580C] text-white"
                  : "bg-[#7C3AED]/10 text-[#7C3AED]"
              }`}>
                <FaShieldHalved className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-admin-mono text-sm font-bold text-[#0F172A] tracking-tight">
                  Cloudflare Downtime Simulation Mode
                </h3>
                <p className="font-admin-mono text-[11px] text-[#64748B]">
                  ADMIN FREEDOM OVERRIDE &bull; PORTFOLIO-WIDE FALLBACK TESTING
                </p>
              </div>
            </div>
          </div>

          {/* Master Toggle Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-admin-mono font-bold px-2.5 py-1 rounded-sm border ${
              formData.isSimulatedDowntime
                ? "bg-[#FFEDD5] border-[#F97316] text-[#C2410C]"
                : "bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]"
            }`}>
              {formData.isSimulatedDowntime ? "OUTAGE SIMULATED (DOWNTIME ON)" : "OPERATIONAL (NORMAL MODE)"}
            </span>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  isSimulatedDowntime: !prev.isSimulatedDowntime,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 ${
                formData.isSimulatedDowntime ? "bg-[#EA580C]" : "bg-[#CBD5E1]"
              }`}
              aria-label="Toggle Cloudflare Downtime Simulation"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isSimulatedDowntime ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <p className="text-xs text-[#334155] leading-relaxed">
            When <strong>Downtime Simulation Mode</strong> is enabled, Cloudflare Turnstile intentionally simulates a persistent outage or firewall conflict across your public portfolio.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-[#E2E8F0] space-y-1">
              <span className="font-admin-mono text-[10px] font-bold text-[#64748B] uppercase block">
                1. 1st Attempt
              </span>
              <p className="text-xs text-[#0F172A] font-semibold">
                Soft Connection Hiccup
              </p>
              <p className="text-[11px] text-[#64748B]">
                Provides 1 immediate user retry with gentle amber banner.
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-[#E2E8F0] space-y-1">
              <span className="font-admin-mono text-[10px] font-bold text-[#64748B] uppercase block">
                2. 2nd Attempt
              </span>
              <p className="text-xs text-[#0F172A] font-semibold">
                Circuit Breaker Trip
              </p>
              <p className="text-[11px] text-[#64748B]">
                Kills background Turnstile loop and highlights Email Code auth.
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-sm border border-[#E2E8F0] space-y-1">
              <span className="font-admin-mono text-[10px] font-bold text-[#64748B] uppercase block">
                3. Resilient Handover
              </span>
              <p className="text-xs text-[#0F172A] font-semibold">
                Email Passcode Verification
              </p>
              <p className="text-[11px] text-[#64748B]">
                Dispatches single-use OTP from Brevo to unlock the bubble.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Engine & Circuit Breaker Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Circuit Breaker Rules */}
        <div className="p-5 bg-white rounded-sm border border-[#E2E8F0] space-y-4">
          <div className="flex items-center gap-2 text-xs font-admin-mono font-bold text-[#0F172A] uppercase tracking-wider">
            <FaBolt className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Circuit Breaker Protection</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-admin-mono font-medium text-[#475569] mb-1">
                Max Retry Attempts Before Kill-Switch:
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={formData.maxRetryAttempts}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxRetryAttempts: Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 2)),
                  }))
                }
                className="w-full px-3 py-2 text-xs font-admin-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Standard: 2 attempts. Prevents infinite challenge loops and CPU resource burn.
              </span>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="text-xs font-admin-mono font-semibold text-[#0F172A] block">
                  Automatic Widget Kill Switch
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Unmounts iframe immediately when circuit trips
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.circuitBreakerEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    circuitBreakerEnabled: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-[#7C3AED] rounded border-[#CBD5E1] focus:ring-[#7C3AED]"
              />
            </div>
          </div>
        </div>

        {/* Card: Gateways & Credentials */}
        <div className="p-5 bg-white rounded-sm border border-[#E2E8F0] space-y-4">
          <div className="flex items-center gap-2 text-xs font-admin-mono font-bold text-[#0F172A] uppercase tracking-wider">
            <FaKey className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Turnstile &amp; Email Identities</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-admin-mono font-medium text-[#475569] mb-1">
                Cloudflare Turnstile Site Key:
              </label>
              <input
                type="text"
                value={formData.siteKey}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    siteKey: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-admin-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Public widget sitekey registered on Cloudflare dashboard.
              </span>
            </div>

            <div>
              <label className="block text-xs font-admin-mono font-medium text-[#475569] mb-1">
                Fallback OTP Sender Identity:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.fallbackEmailGateway}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fallbackEmailGateway: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 pl-8 text-xs font-admin-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                />
                <FaEnvelope className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Strictly adheres to Master Rule 2.7 (Verified domain: gauravpatil.online).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="p-4 bg-white rounded-sm border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="px-3 py-2 rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-admin-mono font-semibold text-[#0F172A] flex items-center gap-1.5 transition-colors"
          >
            <span>Test Live Portfolio (/)</span>
            <FaArrowUpRightFromSquare className="w-3 h-3 text-[#64748B]" />
          </Link>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="px-3.5 py-2 rounded-sm border border-[#E2E8F0] text-xs font-admin-mono font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FaRotateRight className="w-3 h-3 text-[#64748B]" />
            <span>Reset</span>
            <ButtonHelpBadge text={BUTTON_HELP.RESET_CHANGES} />
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-sm bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FaFloppyDisk className="w-3.5 h-3.5" />
            <span>{isPending ? "Saving Settings..." : "Save & Publish Changes"}</span>
            <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} position="top" />
          </button>
        </div>
      </div>
    </form>
  );
};
