import React from "react";

export const TestimonialsSectionSkeleton = () => {
  return (
    <section className="py-20 w-full animate-pulse">
      {/* Headline skeleton */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="w-72 sm:w-80 h-9 bg-white/25 rounded-md mb-2" />
        <div className="w-40 h-4 bg-purple/30 rounded-md" />
      </div>

      <div className="flex flex-col items-center max-lg:mt-10">
        {/* Horizontal Moving Cards container placeholder */}
        <div className="h-[50vh] md:h-[30rem] w-full flex items-center justify-center overflow-hidden gap-8">
          {[1, 2].map((cardIdx) => (
            <div
              key={cardIdx}
              className="w-[90vw] max-w-full md:w-[60vw] h-[280px] md:h-[320px] rounded-2xl border border-white/20 p-6 md:p-12 flex flex-col justify-between shrink-0 skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
            >
              <div className="space-y-3">
                <div className="w-full h-4 bg-white/25 rounded-md" />
                <div className="w-5/6 h-4 bg-white/20 rounded-md" />
                <div className="w-3/4 h-4 bg-purple/25 rounded-md" />
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="w-12 h-12 rounded-full bg-purple/30 border border-purple/40" />
                <div className="space-y-2">
                  <div className="w-32 h-5 bg-white/25 rounded-md" />
                  <div className="w-44 h-3 bg-purple/30 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company logos placeholder */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-16 mt-8">
          {[1, 2, 3, 4, 5].map((logoIdx) => (
            <div key={logoIdx} className="w-24 h-8 bg-white/15 border border-white/10 rounded-md" />
          ))}
        </div>
      </div>
    </section>
  );
};
