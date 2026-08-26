import React from "react";

export const FooterSectionSkeleton = () => {
  return (
    <footer className="w-full pt-20 pb-10 animate-pulse">
      {/* Top CTA */}
      <div className="flex flex-col items-center text-center">
        <div className="w-[85vw] max-w-xl h-12 bg-white/25 rounded-md mb-4" />
        <div className="w-[65vw] max-w-md h-5 bg-purple/30 rounded-md mb-8" />
        <div className="w-48 h-12 bg-purple/30 rounded-xl border border-purple/40 skeleton-shimmer" />
      </div>

      {/* Bottom Footer Divider */}
      <div className="flex flex-col md:flex-row justify-between items-center w-full mt-20 pt-8 border-t border-white/20 gap-4">
        <div className="w-64 h-4 bg-white/20 rounded-md" />
        <div className="flex gap-3">
          {[1, 2, 3].map((icon) => (
            <div
              key={icon}
              className="w-10 h-10 rounded-lg bg-purple/20 border border-purple/35"
            />
          ))}
        </div>
      </div>
    </footer>
  );
};
