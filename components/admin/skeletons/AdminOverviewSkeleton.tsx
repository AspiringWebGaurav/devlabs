import React from "react";

export const AdminOverviewSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-[#E5E7EB] pb-5 space-y-2">
        <div className="w-28 h-3.5 bg-[#E2E8F0] rounded-sm" />
        <div className="w-44 h-7 bg-[#E2E8F0] rounded-sm" />
      </div>

      {/* Canvas Skeleton */}
      <div className="w-full bg-[#FFFFFF] border border-dashed border-[#CBD5E1] rounded-sm p-12 sm:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#F1F5F9] mb-4" />
        <div className="w-48 h-5 bg-[#E2E8F0] rounded-sm mb-2" />
        <div className="w-72 h-3.5 bg-[#F1F5F9] rounded-sm" />
      </div>
    </div>
  );
};
