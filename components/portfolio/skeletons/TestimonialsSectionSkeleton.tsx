import React from "react";

export const TestimonialsSectionSkeleton = () => {
  return (
    <section className="py-20 w-full animate-pulse">
      {/* Headline skeleton */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="w-72 sm:w-80 h-9 bg-white/[0.06] rounded-md mb-2" />
        <div className="w-40 h-4 bg-white/[0.03] rounded-md" />
      </div>

      <div className="flex flex-col items-center max-lg:mt-10">
        {/* Horizontal Moving Cards container placeholder */}
        <div className="h-[50vh] md:h-[30rem] w-full flex items-center justify-center overflow-hidden gap-8">
          {[1, 2].map((cardIdx) => (
            <div
              key={cardIdx}
              className="w-[90vw] md:w-[60vw] h-[280px] md:h-[320px] rounded-2xl border border-slate-800 p-6 md:p-12 flex flex-col justify-between shrink-0"
              style={{ background: "rgb(4,7,29)" }}
            >
              <div className="space-y-3">
                <div className="w-full h-4 bg-white/[0.06] rounded-md" />
                <div className="w-5/6 h-4 bg-white/[0.06] rounded-md" />
                <div className="w-3/4 h-4 bg-white/[0.04] rounded-md" />
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="w-12 h-12 rounded-full bg-white/[0.08]" />
                <div className="space-y-2">
                  <div className="w-32 h-5 bg-white/[0.07] rounded-md" />
                  <div className="w-44 h-3 bg-white/[0.04] rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company logos placeholder */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-16 mt-8">
          {[1, 2, 3, 4, 5].map((logoIdx) => (
            <div key={logoIdx} className="w-24 h-8 bg-white/[0.04] rounded-md" />
          ))}
        </div>
      </div>
    </section>
  );
};
