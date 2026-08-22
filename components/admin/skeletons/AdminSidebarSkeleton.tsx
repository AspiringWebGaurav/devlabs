import React from "react";

export const AdminSidebarSkeleton: React.FC = () => {
  return (
    <aside className="w-full md:w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] shrink-0 p-4 sm:p-5 flex flex-col justify-between h-full min-h-[calc(100vh-57px)] animate-pulse">
      {/* Top: Nav items */}
      <div className="space-y-4">
        <div className="w-20 h-3 bg-[#E2E8F0] rounded-sm mb-4" />
        <div className="w-full h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm" />
      </div>

      {/* Bottom: Profile & Sign Out */}
      <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
        <div className="w-full h-14 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm" />
        <div className="w-full h-9 bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm" />
      </div>
    </aside>
  );
};
