import React from "react";

export const GridSectionSkeleton = () => {
  return (
    <section className="w-full py-20 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 md:grid-row-7 gap-4 lg:gap-8 mx-auto">
        {/* Item 1: Col-span-3 */}
        <div
          className="lg:col-span-3 md:col-span-6 md:row-span-4 lg:min-h-[60vh] min-h-[300px] rounded-3xl border border-white/20 p-5 lg:p-10 flex flex-col justify-end relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
        >
          <div className="w-3/4 h-8 bg-white/25 rounded-md mb-3" />
          <div className="w-1/2 h-5 bg-purple/30 rounded-md" />
        </div>

        {/* Item 2: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-2 min-h-[220px] rounded-3xl border border-white/20 p-5 flex flex-col justify-start relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-xl"
        >
          <div className="w-2/3 h-6 bg-white/25 rounded-md mb-2" />
          <div className="w-1/3 h-4 bg-purple/30 rounded-md" />
        </div>

        {/* Item 3: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-2 min-h-[220px] rounded-3xl border border-white/20 p-5 flex flex-col justify-center items-center relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-xl"
        >
          <div className="w-1/2 h-6 bg-white/25 rounded-md mb-3" />
          <div className="flex gap-2">
            <div className="w-14 h-7 bg-purple/25 border border-purple/30 rounded-lg" />
            <div className="w-14 h-7 bg-purple/25 border border-purple/30 rounded-lg" />
            <div className="w-14 h-7 bg-purple/25 border border-purple/30 rounded-lg" />
          </div>
        </div>

        {/* Item 4: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-1 min-h-[160px] rounded-3xl border border-white/20 p-5 flex flex-col justify-start relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-xl"
        >
          <div className="w-3/4 h-5 bg-white/25 rounded-md mb-2" />
          <div className="w-1/2 h-4 bg-purple/30 rounded-md" />
        </div>

        {/* Item 5: Col-span-3 */}
        <div
          className="md:col-span-3 md:row-span-2 min-h-[240px] rounded-3xl border border-white/20 p-5 lg:p-8 flex flex-col justify-center relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
        >
          <div className="w-1/3 h-4 bg-purple/30 rounded-md mb-2" />
          <div className="w-2/3 h-6 bg-white/25 rounded-md" />
        </div>

        {/* Item 6: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-1 min-h-[180px] rounded-3xl border border-white/20 p-5 flex flex-col justify-center items-center relative overflow-hidden skeleton-shimmer bg-[#0B0F33]/90 shadow-xl"
        >
          <div className="w-3/4 h-5 bg-white/25 rounded-md mb-4" />
          <div className="w-36 h-10 bg-purple/30 border border-purple/40 rounded-full" />
        </div>
      </div>
    </section>
  );
};
