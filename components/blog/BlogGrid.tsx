"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BlogPost } from "@/types/blog";
import { BlogCard } from "./BlogCard";
import { BlogPagination } from "./BlogPagination";
import { BlogEmptyState } from "./BlogEmptyState";

interface BlogGridProps {
  posts: BlogPost[];
  searchQuery?: string;
  selectedCategoryName?: string;
  onResetFilters: () => void;
  itemsPerPage?: number;
}

export const BlogGrid: React.FC<BlogGridProps> = ({
  posts,
  searchQuery,
  selectedCategoryName,
  onResetFilters,
  itemsPerPage = 6,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever posts change (search or category change)
  useEffect(() => {
    setCurrentPage(1);
  }, [posts.length, searchQuery, selectedCategoryName]);

  const totalPages = Math.ceil(posts.length / itemsPerPage);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return posts.slice(startIndex, startIndex + itemsPerPage);
  }, [posts, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to top of grid
    const gridEl = document.getElementById("articles-grid");
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (posts.length === 0) {
    return (
      <BlogEmptyState
        onReset={onResetFilters}
        searchQuery={searchQuery}
        categoryName={selectedCategoryName}
      />
    );
  }

  return (
    <div id="articles-grid" className="w-full">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Latest Articles
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Showing {posts.length} {posts.length === 1 ? "article" : "articles"}
          </p>
        </div>
      </div>

      {/* Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {paginatedPosts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      <BlogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
