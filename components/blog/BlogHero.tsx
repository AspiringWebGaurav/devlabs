"use client";

import React from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { BlogCategory } from "@/types/blog";
import { cn } from "@/lib/utils";

interface BlogHeroProps {
  categories: BlogCategory[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalArticlesCount: number;
}

export const BlogHero: React.FC<BlogHeroProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="pb-12 pt-28 md:pb-16 md:pt-36 relative">
      <div className="flex justify-center relative z-10">
        <div className="max-w-[89vw] md:max-w-3xl lg:max-w-4xl flex flex-col items-center justify-center">
          {/* Subtitle tag matching Hero.tsx */}
          <p className="uppercase tracking-widest text-xs text-center text-blue-100 max-w-80 mb-2">
            Engineering & Design Journal
          </p>

          {/* Heading matching Hero.tsx */}
          <h1 className="heading text-center text-[36px] md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
            Insights, Code & <span className="text-purple">Architecture</span>
          </h1>

          {/* Subtitle text matching Hero.tsx */}
          <p className="text-center md:tracking-wider mb-8 text-sm md:text-base lg:text-lg text-white-200 max-w-2xl leading-relaxed">
            Deep-dives into modern web engineering, 3D graphics with Three.js,
            Next.js performance optimizations, and fluid UI/UX design patterns.
          </p>

          {/* Aceternity-styled Search Bar */}
          <div className="w-full max-w-xl mx-auto relative mb-6">
            <div className="relative flex items-center">
              <FaSearch className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search articles by title, tags, or topic..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#04071D] border border-white/[0.12] text-white placeholder-neutral-400 text-sm focus:outline-none focus:border-purple focus:shadow-[0_0_20px_rgba(203,172,249,0.25)] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3.5 p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Pill Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.slug)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm transition-all duration-200 border cursor-pointer select-none font-medium",
                    isSelected
                      ? "bg-[#161A31] text-purple border-purple shadow-[0_0_15px_rgba(203,172,249,0.3)] scale-105"
                      : "bg-[#10132E] text-white-200 border-white/[0.08] hover:border-white/[0.2] hover:text-white"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
