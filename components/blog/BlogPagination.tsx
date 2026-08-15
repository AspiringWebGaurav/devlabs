"use client";

import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const BlogPagination: React.FC<BlogPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers array with ellipsis if many pages
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <nav
      className="flex items-center justify-between border-t border-white/[0.08] pt-8 mt-12 w-full select-none"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border cursor-pointer",
          currentPage === 1
            ? "opacity-40 border-white/5 text-neutral-500 cursor-not-allowed"
            : "bg-white/[0.03] text-neutral-300 border-white/10 hover:border-purple/40 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        <FaChevronLeft className="w-3 h-3" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers (Desktop / Tablet) */}
      <div className="hidden sm:flex items-center gap-2">
        {getPageNumbers().map((page) => {
          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center border cursor-pointer",
                isCurrent
                  ? "bg-purple text-black font-bold border-purple shadow-[0_0_15px_rgba(203,172,249,0.35)]"
                  : "bg-white/[0.03] text-neutral-300 border-white/10 hover:border-white/30 hover:text-white"
              )}
              aria-current={isCurrent ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Mobile Page Status */}
      <div className="flex sm:hidden items-center text-xs text-neutral-300 font-medium">
        Page {currentPage} of {totalPages}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border cursor-pointer",
          currentPage === totalPages
            ? "opacity-40 border-white/5 text-neutral-500 cursor-not-allowed"
            : "bg-white/[0.03] text-neutral-300 border-white/10 hover:border-purple/40 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <FaChevronRight className="w-3 h-3" />
      </button>
    </nav>
  );
};
