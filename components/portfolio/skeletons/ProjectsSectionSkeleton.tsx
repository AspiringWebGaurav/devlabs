import React from "react";

export const ProjectsSectionSkeleton = () => {
  return (
    <div className="py-20 w-full animate-pulse">
      {/* Headline skeleton */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className="w-80 sm:w-96 h-10 bg-white/[0.06] rounded-md mb-2" />
        <div className="w-48 h-5 bg-white/[0.03] rounded-md" />
      </div>

      <div className="flex flex-wrap items-center justify-center p-4 gap-x-24 gap-y-8 mt-10">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="sm:h-[41rem] h-[32rem] lg:min-h-[32.5rem] flex items-center justify-center sm:w-[570px] w-[80vw]"
          >
            <div
              className="w-full h-full rounded-2xl border border-white/[0.08] p-6 flex flex-col justify-between"
              style={{ background: "rgb(4,7,29)" }}
            >
              {/* Image box placeholder */}
              <div
                className="w-full sm:h-[40vh] h-[30vh] rounded-2xl border border-white/[0.05] mb-6 flex items-center justify-center"
                style={{ backgroundColor: "#13162D" }}
              >
                <div className="w-16 h-16 rounded-full bg-white/[0.04]" />
              </div>

              {/* Title & description placeholder */}
              <div className="space-y-3">
                <div className="w-3/4 h-6 bg-white/[0.07] rounded-md" />
                <div className="w-full h-4 bg-white/[0.04] rounded-md" />
                <div className="w-2/3 h-4 bg-white/[0.04] rounded-md" />
              </div>

              {/* Bottom footer: Icons & link pill */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.04]">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((iconIdx) => (
                    <div
                      key={iconIdx}
                      className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1]"
                    />
                  ))}
                </div>
                <div className="w-28 h-6 bg-white/[0.06] rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
