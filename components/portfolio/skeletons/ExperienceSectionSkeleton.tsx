import React from "react";

export const ExperienceSectionSkeleton = () => {
  return (
    <div className="py-20 w-full animate-pulse">
      {/* Headline */}
      <div className="flex flex-col items-center justify-center mb-12">
        <div className="w-64 sm:w-80 h-9 bg-white/25 rounded-md" />
      </div>

      {/* 4 Cards Grid */}
      <div className="w-full grid lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-10">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[1.75rem] border border-white/20 p-6 flex flex-col items-start gap-4 min-h-[220px] skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-xl bg-purple/25 border border-purple/35" />
            <div className="w-full space-y-2 mt-2">
              <div className="w-3/4 h-5 bg-white/25 rounded-md" />
              <div className="w-full h-3.5 bg-white/15 rounded-md" />
              <div className="w-5/6 h-3.5 bg-purple/25 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
