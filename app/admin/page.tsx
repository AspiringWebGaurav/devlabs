"use client";

import React from "react";
import { AdminHeader, AdminSidebar, OverviewCanvas } from "@/components/admin";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <AdminHeader breadcrumb="OVERVIEW" />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl">
          {/* Section Header */}
          <div className="border-b border-[#E5E7EB] pb-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#64748B] font-semibold">
              Admin Workspace
            </span>
            <h1 className="text-2xl font-bold font-sans text-black tracking-tight mt-0.5">
              Overview
            </h1>
          </div>

          {/* Modular Framework Canvas */}
          <OverviewCanvas />
        </main>
      </div>
    </div>
  );
}
