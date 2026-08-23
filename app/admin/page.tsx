"use client";

import React from "react";
import { AdminHeader, AdminSidebar, OverviewCanvas } from "@/components/admin";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] animate-in fade-in duration-200">
      {/* Clean Edge-to-Edge Admin Header with Dynamic Breadcrumb */}
      <AdminHeader breadcrumb="PORTFOLIO SERVICES" />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        {/* Right Side: Feature Canvas Only (No Redundant Duplicate Headers) */}
        <main className="flex-1 p-4 sm:p-8 flex flex-col max-w-7xl">
          <OverviewCanvas />
        </main>
      </div>
    </div>
  );
}
