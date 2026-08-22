import React from "react";

export const GridSectionSkeleton = () => {
  return (
    <section className="w-full py-20 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 md:grid-row-7 gap-4 lg:gap-8 mx-auto">
        {/* Item 1: Col-span-3 */}
        <div
          className="lg:col-span-3 md:col-span-6 md:row-span-4 lg:min-h-[60vh] min-h-[300px] rounded-3xl border border-white/[0.08] p-5 lg:p-10 flex flex-col justify-end relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-3/4 h-8 bg-white/[0.06] rounded-md mb-3" />
          <div className="w-1/2 h-5 bg-white/[0.04] rounded-md" />
        </div>

        {/* Item 2: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-2 min-h-[220px] rounded-3xl border border-white/[0.08] p-5 flex flex-col justify-start relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-2/3 h-6 bg-white/[0.06] rounded-md mb-2" />
          <div className="w-1/3 h-4 bg-white/[0.04] rounded-md" />
        </div>

        {/* Item 3: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-2 min-h-[220px] rounded-3xl border border-white/[0.08] p-5 flex flex-col justify-center items-center relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-1/2 h-6 bg-white/[0.06] rounded-md mb-3" />
          <div className="flex gap-2">
            <div className="w-14 h-7 bg-white/[0.05] rounded-lg" />
            <div className="w-14 h-7 bg-white/[0.05] rounded-lg" />
            <div className="w-14 h-7 bg-white/[0.05] rounded-lg" />
          </div>
        </div>

        {/* Item 4: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-1 min-h-[160px] rounded-3xl border border-white/[0.08] p-5 flex flex-col justify-start relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-3/4 h-5 bg-white/[0.06] rounded-md mb-2" />
          <div className="w-1/2 h-4 bg-white/[0.04] rounded-md" />
        </div>

        {/* Item 5: Col-span-3 */}
        <div
          className="md:col-span-3 md:row-span-2 min-h-[240px] rounded-3xl border border-white/[0.08] p-5 lg:p-8 flex flex-col justify-center relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-1/3 h-4 bg-white/[0.04] rounded-md mb-2" />
          <div className="w-2/3 h-6 bg-white/[0.06] rounded-md" />
        </div>

        {/* Item 6: Col-span-2 */}
        <div
          className="lg:col-span-2 md:col-span-3 md:row-span-1 min-h-[180px] rounded-3xl border border-white/[0.08] p-5 flex flex-col justify-center items-center relative overflow-hidden"
          style={{ background: "rgb(4,7,29)" }}
        >
          <div className="w-3/4 h-5 bg-white/[0.06] rounded-md mb-4" />
          <div className="w-36 h-10 bg-white/[0.08] rounded-full" />
        </div>
      </div>
    </section>
  );
};
