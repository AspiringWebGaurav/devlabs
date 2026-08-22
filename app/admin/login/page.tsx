"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { FaShieldHalved, FaArrowUpRightFromSquare } from "react-icons/fa6";
import { AdminLoginForm } from "@/components/admin";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-black">
      {/* 1. Edge-to-Edge Top Navigation Bar */}
      <header className="w-full bg-[#FFFFFF] border-b border-[#E5E7EB] px-6 sm:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-base font-black tracking-tight text-black hover:opacity-80 transition-opacity">
          admin panel<span className="text-[#7C3AED]">.</span>
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] hover:text-black transition-colors"
        >
          <span>Live Portfolio</span>
          <FaArrowUpRightFromSquare className="w-2.5 h-2.5 text-[#7C3AED]" />
        </Link>
      </header>

      {/* 2. Centered Swiss Sign-In Card Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <Suspense fallback={<div className="w-full max-w-md h-80 bg-white border border-[#E5E7EB] rounded-sm animate-pulse" />}>
          <AdminLoginForm />
        </Suspense>
      </main>

      {/* 3. Centered Footer */}
      <footer className="w-full py-6 px-4 text-center text-xs font-mono text-[#94A3B8] flex items-center justify-center gap-2 border-t border-[#E5E7EB]/60">
        <FaShieldHalved className="w-3 h-3 text-[#10B981]" />
        <span>Protected by Gaurav Portfolio Security Architecture</span>
      </footer>
    </div>
  );
}
