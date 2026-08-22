import React from "react";

export const ApproachSectionSkeleton = () => {
  return (
    <section className="w-full py-20 animate-pulse">
      {/* Headline */}
      <div className="flex flex-col items-center justify-center mb-16">
        <div className="w-56 sm:w-72 h-9 bg-white/[0.06] rounded-md" />
      </div>

      {/* 3 Approach Cards */}
      <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-6">
        {[1, 2, 3].map((phase) => (
          <div
            key={phase}
            className="border border-white/[0.08] max-w-sm w-full p-8 relative lg:h-[35rem] h-[28rem] rounded-3xl flex flex-col justify-center items-center text-center"
            style={{ background: "rgb(4,7,29)" }}
          >
            <div className="w-28 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] mb-6" />
            <div className="w-48 h-6 bg-white/[0.07] rounded-md mb-4" />
            <div className="w-full space-y-2">
              <div className="w-full h-3.5 bg-white/[0.04] rounded-md" />
              <div className="w-5/6 h-3.5 bg-white/[0.04] rounded-md mx-auto" />
              <div className="w-4/6 h-3.5 bg-white/[0.04] rounded-md mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
