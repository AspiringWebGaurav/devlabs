import React from "react";
import { Spotlight } from "@/components/ui/Spotlight";

export default function BlogListingLoading() {
  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip min-h-screen text-white">
      {/* Background Spotlights */}
      <div>
        <Spotlight
          className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen"
          fill="white"
        />
        <Spotlight
          className="h-[80vh] w-[50vw] top-10 left-full"
          fill="purple"
        />
        <Spotlight className="left-80 top-28 h-[80vh] w-[50vw]" fill="blue" />
      </div>

      {/* Full-width Grid Background */}
      <div className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="max-w-7xl w-full relative z-10 flex flex-col justify-between min-h-screen">
        {/* Navigation placeholder */}
        <div className="h-16 w-full" />

        <div className="pb-16 flex-grow">
          {/* Hero Skeleton */}
          <div className="pb-12 pt-20 md:pb-16 md:pt-28 flex flex-col items-center justify-center text-center">
            <div className="w-40 sm:w-48 h-4 rounded-full bg-[#10132E] skeleton-shimmer mb-4" />
            <div className="w-full max-w-[280px] sm:max-w-[480px] h-10 sm:h-14 rounded-2xl bg-[#10132E] skeleton-shimmer mb-4" />
            <div className="w-full max-w-[220px] sm:max-w-sm h-4 sm:h-5 rounded-xl bg-[#10132E] skeleton-shimmer mb-8" />

            {/* Search Input Skeleton */}
            <div className="w-full max-w-xl h-12 rounded-2xl bg-[#04071D] border border-white/[0.08] skeleton-shimmer mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" />

            {/* Filter Pills Skeletons */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
              {[70, 95, 85, 110, 125].map((w, i) => (
                <div
                  key={i}
                  style={{ width: `${w}px` }}
                  className="h-8 rounded-xl bg-[#10132E] border border-white/[0.06] skeleton-shimmer"
                />
              ))}
            </div>
          </div>

          {/* Featured Post Card Skeleton */}
          <div
            style={{
              background: "rgb(4,7,29)",
              backgroundColor:
                "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
            }}
            className="mb-14 rounded-3xl border border-white/[0.1] p-6 sm:p-8 lg:p-10 shadow-input"
          >
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="w-full lg:w-1/2 aspect-[16/10] rounded-2xl bg-[#13162D] skeleton-shimmer border border-white/[0.08]" />
              <div className="w-full lg:w-1/2 space-y-4">
                <div className="flex gap-3">
                  <div className="w-24 h-6 rounded-xl bg-[#10132E] skeleton-shimmer" />
                  <div className="w-20 h-6 rounded-xl bg-[#10132E] skeleton-shimmer" />
                </div>
                <div className="w-full h-9 rounded-xl bg-[#10132E] skeleton-shimmer" />
                <div className="w-3/4 h-9 rounded-xl bg-[#10132E] skeleton-shimmer" />
                <div className="w-full h-4 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-2/3 h-4 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="pt-6 border-t border-white/[0.08] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#10132E] skeleton-shimmer" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3.5 rounded bg-[#10132E] skeleton-shimmer" />
                      <div className="w-16 h-2.5 rounded bg-[#10132E] skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="w-24 h-4 rounded bg-[#10132E] skeleton-shimmer" />
                </div>
              </div>
            </div>
          </div>

          {/* 3-Column Articles Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                style={{
                  background: "rgb(4,7,29)",
                  backgroundColor:
                    "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
                }}
                className="rounded-3xl border border-white/[0.1] p-5 shadow-input space-y-4"
              >
                <div className="w-full h-48 sm:h-52 rounded-2xl bg-[#13162D] skeleton-shimmer border border-white/[0.08]" />
                <div className="w-28 h-3.5 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-full h-6 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-4/5 h-6 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-full h-3 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-2/3 h-3 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#10132E] skeleton-shimmer" />
                    <div className="w-20 h-3 rounded bg-[#10132E] skeleton-shimmer" />
                  </div>
                  <div className="w-12 h-3 rounded bg-[#10132E] skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
