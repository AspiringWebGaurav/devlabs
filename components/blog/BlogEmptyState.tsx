"use client";

import React from "react";
import { FaSearchMinus, FaRedo } from "react-icons/fa";

interface BlogEmptyStateProps {
  onReset: () => void;
  searchQuery?: string;
  categoryName?: string;
}

export const BlogEmptyState: React.FC<BlogEmptyStateProps> = ({
  onReset,
  searchQuery,
  categoryName,
}) => {
  return (
    <div className="py-16 sm:py-24 text-center px-4 rounded-3xl border border-white/[0.08] bg-[#04071D] max-w-xl mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-purple/[0.1] border border-purple/30 text-purple flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(203,172,249,0.2)]">
        <FaSearchMinus className="w-7 h-7" />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
        No articles found
      </h3>

      <p className="text-white-200 text-sm max-w-md mx-auto mb-6 leading-relaxed">
        {searchQuery
          ? `We couldn't find any articles matching "${searchQuery}".`
          : categoryName
          ? `There are currently no articles in the "${categoryName}" category.`
          : "Try searching for a different keyword or explore all categories."}
      </p>

      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple text-black font-semibold text-xs sm:text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(203,172,249,0.35)] cursor-pointer"
      >
        <FaRedo className="w-3 h-3" />
        Reset Filters
      </button>
    </div>
  );
};
