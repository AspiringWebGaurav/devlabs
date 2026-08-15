"use client";

import React, { useState } from "react";
import { FaTwitter, FaLinkedinIn, FaLink, FaCheck } from "react-icons/fa";

interface ArticleShareProps {
  title: string;
  slug: string;
}

export const ArticleShare: React.FC<ArticleShareProps> = ({ title, slug }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : `https://gauravpatil.online/blog/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy URL", e);
    }
  };

  const handleShareTwitter = () => {
    const url = typeof window !== "undefined" ? window.location.href : `https://gauravpatil.online/blog/${slug}`;
    const text = encodeURIComponent(`${title} by @AspiringWebGaurav`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareLinkedIn = () => {
    const url = typeof window !== "undefined" ? window.location.href : `https://gauravpatil.online/blog/${slug}`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mr-2">
        Share:
      </span>

      <button
        onClick={handleShareTwitter}
        className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 hover:border-purple/50 hover:bg-purple/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        aria-label="Share on X / Twitter"
      >
        <FaTwitter className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleShareLinkedIn}
        className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 hover:border-purple/50 hover:bg-purple/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        aria-label="Share on LinkedIn"
      >
        <FaLinkedinIn className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleCopyLink}
        className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 hover:border-purple/50 hover:bg-purple/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        aria-label="Copy article link"
      >
        {copied ? (
          <FaCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <FaLink className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
