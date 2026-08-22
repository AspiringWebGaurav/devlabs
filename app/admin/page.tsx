"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  FaDatabase,
  FaEnvelope,
  FaServer,
  FaShieldHalved,
  FaArrowUpRightFromSquare,
  FaRotate,
} from "react-icons/fa6";

interface MessageItem {
  id: string;
  name: string;
  email: string;
  category?: string;
  message: string;
  date: string;
}

export default function AdminDashboardPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent contact submissions via RTDB REST
  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const dbUrl = (
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
        "https://gaurav-portfolio-improved-default-rtdb.asia-southeast1.firebasedatabase.app/"
      ).replace(/\/$/, "");

      const res = await fetch(`${dbUrl}/messages.json`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          const list: MessageItem[] = Object.entries(data).map(([k, v]) => ({
            id: k,
            ...(v as Omit<MessageItem, "id">),
          }));
          setMessages(list.reverse());
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <AdminHeader breadcrumb="OVERVIEW & DATABASE" />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl">
          {/* Top Headline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                Superadmin Console
              </span>
              <h1 className="text-2xl font-bold font-sans text-black tracking-tight mt-0.5">
                Dashboard Overview
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchMessages}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] border border-[#E5E7EB] hover:border-black/30 text-black rounded-sm text-xs font-mono transition-colors cursor-pointer"
              >
                <FaRotate className={`w-3 h-3 text-[#64748B] ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh Data</span>
              </button>

              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-2 px-3.5 py-2 bg-[#000000] text-[#FFFFFF] rounded-sm text-xs font-mono font-bold uppercase tracking-wider hover:bg-[#18181B] transition-colors"
              >
                <span>Live Portfolio</span>
                <FaArrowUpRightFromSquare className="w-3 h-3 text-[#A855F7]" />
              </Link>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: System Status */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-4 sm:p-5 rounded-none sm:rounded-[2px] shadow-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  System Engine
                </span>
                <FaServer className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-xl font-bold font-mono text-black mt-3">Next.js 15.5</p>
              <p className="text-[11px] font-mono text-[#10B981] font-semibold mt-1">
                ● App Router & React 19 Active
              </p>
            </div>

            {/* Card 2: Contact Inquiries */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-4 sm:p-5 rounded-none sm:rounded-[2px] shadow-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Inquiries Received
                </span>
                <FaEnvelope className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <p className="text-2xl font-bold font-mono text-black mt-3">
                {isLoading ? "..." : messages.length}
              </p>
              <p className="text-[11px] font-mono text-[#64748B] mt-1">
                Realtime Contact Submissions
              </p>
            </div>

            {/* Card 3: Database Services */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-4 sm:p-5 rounded-none sm:rounded-[2px] shadow-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Database Link
                </span>
                <FaDatabase className="w-4 h-4 text-[#A855F7]" />
              </div>
              <p className="text-xl font-bold font-mono text-black mt-3">Firebase RTDB</p>
              <p className="text-[11px] font-mono text-[#A855F7] font-semibold mt-1">
                asia-southeast1 Connected
              </p>
            </div>

            {/* Card 4: Access Control */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-4 sm:p-5 rounded-none sm:rounded-[2px] shadow-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Authorized Admin
                </span>
                <FaShieldHalved className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <p className="text-base font-bold font-mono text-black mt-3 truncate" title="gauravpatil9262">
                gauravpatil9262
              </p>
              <p className="text-[11px] font-mono text-[#10B981] font-semibold mt-1">
                Single-Superadmin Locked
              </p>
            </div>
          </div>

          {/* Recent Inquiries Table */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-none sm:rounded-[2px] shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-base font-bold font-sans text-black">
                  Recent Contact Submissions
                </h2>
                <p className="text-xs text-[#64748B] font-sans">
                  Inbound inquiries received through the portfolio contact form.
                </p>
              </div>
              <span className="font-mono text-xs text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-sm">
                Total: {messages.length}
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs font-mono text-[#94A3B8]">
                Loading live inquiries...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded-sm">
                No inquiries received yet. Inquiries submitted on the live site will stream here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] font-mono text-[10px] text-[#64748B] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-mono">
                    {messages.slice(0, 10).map((msg) => (
                      <tr key={msg.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {msg.date ? new Date(msg.date).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-black">{msg.name}</td>
                        <td className="py-3 px-3 text-[#3B82F6]">{msg.email}</td>
                        <td className="py-3 px-3 text-[#A855F7]">{msg.category || "General"}</td>
                        <td className="py-3 px-3 text-[#475569] max-w-xs truncate font-sans" title={msg.message}>
                          {msg.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
