import React from "react";

/**
 * Lightweight, zero-CLS early loading representation of the Assistant launcher bubble.
 * Rendered by Next.js dynamic import during chunk loading/hydration with matching layout geometry.
 */
export const AssistantBubbleSkeleton: React.FC = () => {
  return (
    <div
      className="fixed z-[4900] flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-neutral-900 border border-neutral-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.25)] pointer-events-none select-none"
      style={{
        bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
      }}
      aria-hidden="true"
    >
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-200/80 animate-pulse" />
    </div>
  );
};
