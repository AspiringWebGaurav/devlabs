import React from "react";
import { Spotlight } from "@/components/ui/Spotlight";

interface RootLoadingProps {
  embedded?: boolean;
}

export default function RootLoading({ embedded = false }: RootLoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center gap-6 px-4">
      {/* Perfectly Centered Glassmorphic Orb Container */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
        {/* Absolute Glowing Ambient Halo */}
        <div className="absolute inset-0 m-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple/25 blur-xl animate-pulse pointer-events-none" />

        {/* Transparent Glass Ring with Spinning Neon Accent */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[2px] border-white/10 border-t-purple border-r-[#CBACF9] animate-spin [animation-duration:1.4s] flex items-center justify-center bg-white/[0.03] backdrop-blur-xl shadow-[0_0_30px_rgba(203,172,249,0.25)]">
          {/* Inner Glowing Lavender Core */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-purple/80 via-[#CBACF9] to-white shadow-[0_0_15px_#CBACF9] animate-pulse" />
        </div>
      </div>

      {/* Synchronized Centered Typography */}
      <div className="space-y-1.5 max-w-xs mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs sm:text-sm text-purple font-semibold">
          Loading Experience
        </p>
        <p className="text-[11px] sm:text-xs text-white-200/60 tracking-wider">
          Preparing components & shaders...
        </p>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto min-h-screen overflow-clip text-white">
      {/* Ambient Lighting */}
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

      {/* Grid Pattern Background */}
      <div className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="relative z-10">{content}</div>
    </main>
  );
}
