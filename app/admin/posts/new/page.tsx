import React from "react";

export default function NewPostPage() {
  return (
    <div className="w-full h-full min-h-full flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-transparent">
      <span className="text-[11px] font-admin-mono tracking-widest text-[#737373] uppercase mb-2">
        03. NEW POST &bull; BLANK CANVAS
      </span>
      <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
        New Post Creator
      </h2>
      <p className="text-xs sm:text-[13px] text-[#737373] mt-1.5 max-w-md leading-relaxed font-admin-sans">
        Clean blank canvas ready to build your custom editor from scratch.
      </p>
    </div>
  );
}
