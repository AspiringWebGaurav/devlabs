"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaDatabase, FaSliders } from "react-icons/fa6";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      id: "01",
      label: "Overview & Database",
      href: "/admin",
      icon: FaDatabase,
    },
    {
      id: "02",
      label: "Security & Settings",
      href: "/admin/settings",
      icon: FaSliders,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] shrink-0 p-4 sm:p-6 space-y-6">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8] font-bold block mb-4">
          Navigation
        </span>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs font-mono transition-all duration-150 ${
                  isActive
                    ? "bg-[#000000] text-[#FFFFFF] font-bold shadow-xs"
                    : "text-[#64748B] hover:text-[#000000] hover:bg-[#F8FAFC]"
                }`}
              >
                <span
                  className={`text-[10px] ${
                    isActive ? "text-[#A855F7]" : "text-[#94A3B8]"
                  }`}
                >
                  {item.id}.
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#A855F7]" : "text-[#94A3B8]"}`} />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Badge */}
      <div className="pt-6 border-t border-[#F1F5F9]">
        <div className="bg-[#FAFAFA] border border-[#E2E8F0] p-3 rounded-sm">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
            <span>System Status</span>
            <span className="flex items-center gap-1 text-[#10B981] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              ONLINE
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#94A3B8] mt-1">
            Gaurav Portfolio Engine v0.0.1
          </p>
        </div>
      </div>
    </aside>
  );
};
