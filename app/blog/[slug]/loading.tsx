import React from "react";
import { Spotlight } from "@/components/ui/Spotlight";

export default function ArticleDetailLoading() {
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

      <div className="max-w-7xl w-full relative z-10 flex flex-col justify-between min-h-screen pt-28 pb-20">
        <div>
          {/* Back link placeholder */}
          <div className="w-32 sm:w-36 h-4 rounded bg-[#10132E] skeleton-shimmer mb-6 sm:mb-8" />

          {/* Badges placeholder */}
          <div className="flex gap-2.5 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-24 sm:w-28 h-6 rounded-xl bg-[#10132E] skeleton-shimmer" />
            <div className="w-20 sm:w-24 h-6 rounded-xl bg-[#10132E] skeleton-shimmer" />
          </div>

          {/* Title placeholder */}
          <div className="w-full max-w-2xl h-8 sm:h-12 rounded-2xl bg-[#10132E] skeleton-shimmer mb-3" />
          <div className="w-3/4 max-w-xl h-8 sm:h-12 rounded-2xl bg-[#10132E] skeleton-shimmer mb-6" />

          {/* Author bar placeholder */}
          <div className="flex items-center justify-between py-6 border-y border-white/[0.08] mb-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#10132E] skeleton-shimmer" />
              <div className="space-y-2">
                <div className="w-32 h-4 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-24 h-3 rounded bg-[#10132E] skeleton-shimmer" />
              </div>
            </div>
            <div className="hidden sm:flex gap-2">
              <div className="w-16 h-6 rounded-lg bg-[#10132E] skeleton-shimmer" />
              <div className="w-16 h-6 rounded-lg bg-[#10132E] skeleton-shimmer" />
            </div>
          </div>

          {/* Large Cover Image Skeleton */}
          <div className="w-full rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] bg-[#13162D] skeleton-shimmer border border-white/[0.1] shadow-input mb-12" />

          {/* 2-Column Body Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Left Prose Column */}
            <div className="lg:col-span-8 space-y-8">
              <div className="space-y-3">
                <div className="w-full h-4 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-full h-4 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-4/5 h-4 rounded bg-[#10132E] skeleton-shimmer" />
              </div>

              {/* Code block skeleton */}
              <div className="rounded-2xl border border-white/[0.1] bg-[#04071D] p-6 space-y-3 shadow-input">
                <div className="w-32 h-3.5 rounded bg-[#10132E] skeleton-shimmer mb-4" />
                <div className="w-3/4 h-3.5 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-1/2 h-3.5 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-2/3 h-3.5 rounded bg-[#10132E] skeleton-shimmer" />
              </div>

              <div className="space-y-3">
                <div className="w-full h-4 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-5/6 h-4 rounded bg-[#10132E] skeleton-shimmer" />
                <div className="w-3/4 h-4 rounded bg-[#10132E] skeleton-shimmer" />
              </div>
            </div>

            {/* Right Sticky Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-4 space-y-6">
              <div
                style={{
                  background: "rgb(4,7,29)",
                  backgroundColor:
                    "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
                }}
                className="rounded-2xl border border-white/[0.1] p-5 shadow-input space-y-3 sticky top-28"
              >
                <div className="w-36 h-4 rounded bg-[#10132E] skeleton-shimmer pb-2 border-b border-white/[0.08]" />
                <div className="w-full h-7 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-4/5 h-7 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-3/4 h-7 rounded-lg bg-[#10132E] skeleton-shimmer" />
                <div className="w-5/6 h-7 rounded-lg bg-[#10132E] skeleton-shimmer" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
