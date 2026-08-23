"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaDatabase, FaRightFromBracket } from "react-icons/fa6";
import { useAdminSession } from "@/components/admin/context";
import { AdminProfileCard, AdminProfileModal } from "@/components/admin/profile";
import { SignOutOverlay } from "@/components/admin/auth/SignOutOverlay";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, signOut } = useAdminSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const navItems = [
    {
      id: "01",
      label: "Portfolio Services",
      href: "/admin",
      icon: FaDatabase,
    },
  ];

  return (
    <>
      <aside className="w-full md:w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] shrink-0 p-4 sm:p-5 flex flex-col justify-between md:sticky md:top-[57px] md:h-[calc(100vh-57px)] select-none">
        {/* Top: Navigation */}
        <div className="space-y-6">
          <div>
            <span className="font-admin-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8] font-bold block mb-4">
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs font-admin-mono transition-all duration-150 border ${
                      isActive
                        ? "bg-[#F8FAFC] border-[#E2E8F0] text-black font-semibold shadow-2xs"
                        : "border-transparent text-[#64748B] hover:text-black hover:bg-[#F8FAFC] hover:border-[#F1F5F9]"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-semibold ${
                        isActive ? "text-[#7C3AED]" : "text-[#94A3B8]"
                      }`}
                    >
                      {item.id}.
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#7C3AED]" : "text-[#94A3B8]"}`} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: User Profile & Sign-Out */}
        <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
          {/* Interactive Profile Card Trigger */}
          <AdminProfileCard
            user={user}
            onClick={() => setIsProfileOpen(true)}
          />

          {/* Clean Sign Out Action Button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-admin-mono text-[#991B1B] hover:text-[#FFFFFF] bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FCA5A5] hover:border-[#DC2626] rounded-sm transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.99] disabled:opacity-60"
            title="Sign out of Admin Console"
          >
            <FaRightFromBracket className="w-3 h-3 shrink-0" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* Swiss Light Profile Modal */}
      <AdminProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      {/* Zero-Residual Sign Out Overlay */}
      <SignOutOverlay isOpen={isSigningOut} />
    </>
  );
};
