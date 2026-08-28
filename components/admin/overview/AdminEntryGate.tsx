"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPageContainer } from "../layout";
import { AdminSuspense } from "../suspense";
import { OverviewCanvas } from "./OverviewCanvas";
import type { AdminSession } from "@/lib/admin/auth";

interface AdminEntryGateProps {
  initialSession: AdminSession | null;
}

export const AdminEntryGate: React.FC<AdminEntryGateProps> = ({ initialSession }) => {
  const router = useRouter();

  useEffect(() => {
    if (!initialSession) {
      const timer = setTimeout(() => {
        router.replace("/admin/login");
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [initialSession, router]);

  if (!initialSession) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150">
        <div className="flex flex-col items-center space-y-4 max-w-xs text-center">
          {/* Concentric Dual-Ring Center Spinner */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Outer Track */}
            <div className="absolute inset-0 rounded-full border-2 border-[#E2E8F0]" />
            {/* Outer Fast Purple Arc */}
            <svg
              className="absolute inset-0 w-full h-full animate-spin text-[#7C3AED]"
              viewBox="0 0 48 48"
              fill="none"
              style={{ animationDuration: "0.9s" }}
            >
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="30 95"
              />
            </svg>
            {/* Inner Dark Arc */}
            <svg
              className="w-7 h-7 text-[#0F172A]"
              viewBox="0 0 28 28"
              fill="none"
              style={{ animation: "spin 1.5s linear infinite reverse" }}
            >
              <circle
                cx="14"
                cy="14"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="16 48"
              />
            </svg>
            {/* Center Core */}
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
          </div>

          <div className="space-y-1">
            <h4 className="font-admin-sans font-bold text-xs text-black tracking-tight">
              Loading Admin
            </h4>
            <p className="font-admin-mono text-[10px] text-[#64748B]">
              Checking credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminPageContainer breadcrumb="PORTFOLIO SERVICES">
      <AdminSuspense fallbackTitle="Portfolio Services Workspace">
        <OverviewCanvas />
      </AdminSuspense>
    </AdminPageContainer>
  );
};
