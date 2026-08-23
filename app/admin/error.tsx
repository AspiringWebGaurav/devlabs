"use client";

import React, { useEffect } from "react";
import { FaTriangleExclamation, FaRotateRight, FaArrowLeft } from "react-icons/fa6";
import Link from "next/link";
import { adminLogger } from "@/lib/admin/logger";

export default function AdminRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    adminLogger.error("AdminRouteError", error, "Route boundary caught an error");
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#FAFAFA] text-black">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#FCA5A5] p-6 sm:p-8 rounded-none sm:rounded-sm space-y-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-sm bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <FaTriangleExclamation className="w-5 h-5 text-[#DC2626]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-admin-sans font-extrabold text-lg text-black tracking-tight">
              Administrative Error
            </h2>
            <p className="font-admin-mono text-xs text-[#64748B] mt-0.5">
              An unexpected error interrupted this view.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#FAFAFA] border border-[#E2E8F0] rounded-xs">
          <p className="font-admin-mono text-xs text-[#334155] break-words">
            {error.message || "An unexpected error occurred in the administrative subsystem."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-admin-mono text-[#64748B] hover:text-black transition-colors"
          >
            <FaArrowLeft className="w-3 h-3 text-[#7C3AED]" />
            <span>Return to Workspace</span>
          </Link>

          <button
            onClick={() => reset()}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-admin-mono font-bold uppercase tracking-wider bg-[#000000] hover:bg-[#18181B] text-white rounded-sm transition-all cursor-pointer shadow-xs"
          >
            <FaRotateRight className="w-3 h-3 text-white" />
            <span>Reload Route</span>
          </button>
        </div>
      </div>
    </div>
  );
}
