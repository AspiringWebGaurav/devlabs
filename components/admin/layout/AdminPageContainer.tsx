import React from "react";
import { AdminHeader, AdminSidebar } from "../navigation";

interface AdminPageContainerProps {
  breadcrumb: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminPageContainer: React.FC<AdminPageContainerProps> = ({
  breadcrumb,
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] animate-in fade-in duration-200">
      {/* 1. Locked Edge-to-Edge Admin Header with Dynamic Breadcrumb */}
      <AdminHeader breadcrumb={breadcrumb} />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* 2. Pinned Sticky Sidebar */}
        <AdminSidebar />

        {/* 3. Right-Side Feature Workspace Canvas */}
        <main className="flex-1 p-5 sm:p-8 lg:p-10 flex flex-col w-full min-w-0">
          {(title || actions) && (
            <div className="border-b border-[#E5E7EB] pb-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <div>
                {subtitle && (
                  <span className="font-admin-mono text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold block">
                    {subtitle}
                  </span>
                )}
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold font-admin-sans text-black tracking-tight mt-0.5">
                    {title}
                  </h1>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}

          <div className="flex-1 flex flex-col w-full animate-in fade-in duration-150">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


