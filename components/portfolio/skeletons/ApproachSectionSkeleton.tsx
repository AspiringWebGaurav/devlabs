import React from "react";

export const ApproachSectionSkeleton = () => {
  return (
    <section className="w-full py-20 animate-pulse">
      {/* Headline */}
      <div className="flex flex-col items-center justify-center mb-16">
        <div className="w-56 sm:w-72 h-9 bg-white/25 rounded-md" />
      </div>

      {/* 3 Approach Cards */}
      <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-6">
        {[1, 2, 3].map((phase) => (
          <div
            key={phase}
            className="border border-white/20 max-w-sm w-full p-8 relative lg:h-[35rem] h-[28rem] rounded-3xl flex flex-col justify-center items-center text-center skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
          >
            <div className="w-28 h-12 rounded-full bg-purple/25 border border-purple/40 mb-6" />
            <div className="w-48 h-6 bg-white/25 rounded-md mb-4" />
            <div className="w-full space-y-2">
              <div className="w-full h-3.5 bg-white/20 rounded-md" />
              <div className="w-5/6 h-3.5 bg-white/15 rounded-md mx-auto" />
              <div className="w-4/6 h-3.5 bg-purple/25 rounded-md mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
