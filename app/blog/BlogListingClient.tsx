"use client";

import React, { useState, useMemo } from "react";
import { BlogPost, BlogCategory } from "@/types/blog";
import { BlogHero } from "@/components/blog/BlogHero";
import { FeaturedPostCard } from "@/components/blog/FeaturedPostCard";
import { BlogCarousel } from "@/components/blog/BlogCarousel";
import { BlogGrid } from "@/components/blog/BlogGrid";

interface BlogListingClientProps {
  initialPosts: BlogPost[];
  categories: BlogCategory[];
  featuredPost: BlogPost | null;
}

export const BlogListingClient: React.FC<BlogListingClientProps> = ({
  initialPosts,
  categories,
  featuredPost,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filtered posts calculation
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      // Category filter
      const matchesCategory =
        selectedCategory === "all" || post.category.slug === selectedCategory;

      // Search filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.subtitle.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        post.category.name.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [initialPosts, selectedCategory, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const isBrowsingAllDefault =
    !searchQuery.trim() && selectedCategory === "all";

  const selectedCategoryObj = categories.find(
    (c) => c.slug === selectedCategory
  );

  return (
    <>
      {/* Blog Hero with Search & Categories */}
      <BlogHero
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalArticlesCount={filteredPosts.length}
      />

      {/* Featured Post Highlight (shown on root /blog view) */}
      {isBrowsingAllDefault && featuredPost && (
        <section aria-label="Featured Article">
          <FeaturedPostCard post={featuredPost} />
        </section>
      )}

      {/* Auto-sliding Carousel of highlighted stories */}
      {isBrowsingAllDefault && initialPosts.length > 2 && (
        <section aria-label="Highlighted Stories">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Trending Stories
            </h2>
          </div>
          <BlogCarousel posts={initialPosts.slice(0, 4)} />
        </section>
      )}

      {/* Main Articles Grid with Pagination & Empty State */}
      <section aria-label="Article Grid">
        <BlogGrid
          posts={filteredPosts}
          searchQuery={searchQuery}
          selectedCategoryName={
            selectedCategory !== "all" ? selectedCategoryObj?.name : undefined
          }
          onResetFilters={handleResetFilters}
          itemsPerPage={6}
        />
      </section>
    </>
  );
};
