import React from "react";

export const ProjectsSectionSkeleton = () => {
  return (
    <div className="py-20 w-full animate-pulse">
      {/* Headline skeleton */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="w-80 sm:w-96 h-10 bg-white/25 rounded-md mb-2" />
        <div className="w-48 h-5 bg-purple/30 rounded-md" />
      </div>

      <div className="flex flex-wrap items-center justify-center p-4 gap-x-24 gap-y-8 mt-10">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="sm:h-[41rem] h-[32rem] lg:min-h-[32.5rem] flex items-center justify-center sm:w-[570px] w-[80vw]"
          >
            <div
              className="w-full h-full rounded-2xl border border-white/20 p-6 flex flex-col justify-between skeleton-shimmer bg-[#0B0F33]/90 shadow-2xl"
            >
              {/* Image box placeholder */}
              <div
                className="w-full sm:h-[40vh] h-[30vh] rounded-2xl border border-white/10 mb-6 flex items-center justify-center bg-[#13162D]"
              >
                <div className="w-16 h-16 rounded-full bg-purple/20 border border-purple/30" />
              </div>

              {/* Title & description placeholder */}
              <div className="space-y-3">
                <div className="w-3/4 h-6 bg-white/25 rounded-md" />
                <div className="w-full h-4 bg-white/15 rounded-md" />
                <div className="w-2/3 h-4 bg-purple/25 rounded-md" />
              </div>

              {/* Bottom footer: Icons & link pill */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((iconIdx) => (
                    <div
                      key={iconIdx}
                      className="w-8 h-8 rounded-full bg-purple/25 border border-purple/35"
                    />
                  ))}
                </div>
                <div className="w-28 h-6 bg-purple/30 border border-purple/40 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
