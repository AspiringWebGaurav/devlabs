"use client";

import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { BlogPost } from "@/types/blog";

interface ArticleNavigationProps {
  prev: BlogPost | null;
  next: BlogPost | null;
}

export const ArticleNavigation: React.FC<ArticleNavigationProps> = ({
  prev,
  next,
}) => {
  if (!prev && !next) return null;

  return (
    <nav
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-12 pt-8 border-t border-white/[0.08]"
      aria-label="Article navigation"
    >
      {/* Previous Article Card */}
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          style={{
            background: "rgb(4,7,29)",
            backgroundColor:
              "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
          }}
          className="rounded-2xl border border-white/[0.1] p-5 hover:border-purple/50 transition-all duration-300 group flex flex-col justify-between shadow-input"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-purple uppercase tracking-wider mb-2">
            <FaArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Previous Article
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple transition-colors line-clamp-2">
            {prev.title}
          </h4>
        </Link>
      ) : (
        <div />
      )}

      {/* Next Article Card */}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          style={{
            background: "rgb(4,7,29)",
            backgroundColor:
              "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
          }}
          className="rounded-2xl border border-white/[0.1] p-5 hover:border-purple/50 transition-all duration-300 group flex flex-col justify-between text-right sm:items-end shadow-input"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-purple uppercase tracking-wider mb-2">
            Next Article
            <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple transition-colors line-clamp-2">
            {next.title}
          </h4>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
};
