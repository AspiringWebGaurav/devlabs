"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import { BlogPost } from "@/types/blog";
import { cn } from "@/lib/utils";

interface BlogCarouselProps {
  posts: BlogPost[];
  autoSlideInterval?: number;
}

export const BlogCarousel: React.FC<BlogCarouselProps> = ({
  posts,
  autoSlideInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideCount = posts.length;

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount);
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [slideCount, isPaused, autoSlideInterval]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  };

  if (!posts || posts.length === 0) return null;

  return (
    <div
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="relative mb-16 rounded-3xl overflow-hidden border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[320px] sm:h-[380px] md:h-[420px] w-full overflow-hidden">
        {posts.map((post, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={post.id}
              className={cn(
                "absolute inset-0 transition-all duration-700 ease-in-out flex flex-col justify-end p-6 sm:p-10",
                isActive
                  ? "opacity-100 scale-100 z-20 pointer-events-auto"
                  : "opacity-0 scale-95 z-10 pointer-events-none"
              )}
            >
              {/* Background Cover Image with Dark Overlay */}
              <div className="absolute inset-0 -z-10">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04071D] via-[#04071D]/80 to-transparent" />
                <div className="absolute inset-0 bg-black/40" />
              </div>

              {/* Slide Content */}
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 rounded-xl bg-[#10132E] text-purple text-xs font-semibold uppercase tracking-wider border border-white/[0.08]">
                    {post.category.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white-200">
                    <FaClock className="w-3 h-3 text-purple" />
                    {post.readingTime}
                  </span>
                </div>

                <Link href={`/blog/${post.slug}`} className="block group">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white group-hover:text-purple transition-colors duration-200 line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                </Link>

                <p className="text-xs sm:text-sm text-white-200 line-clamp-2 mb-4 max-w-2xl">
                  {post.excerpt}
                </p>

                <div className="flex items-center gap-3">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full border border-white/20 object-cover bg-black"
                  />
                  <span className="text-xs font-semibold text-white">
                    {post.author.name}
                  </span>
                  <span className="text-xs text-white-200">·</span>
                  <span className="text-xs text-white-200">
                    {post.publishedAt}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#10132E]/80 border border-white/20 text-white flex items-center justify-center hover:bg-purple hover:text-black hover:border-purple transition-all backdrop-blur-md cursor-pointer shadow-md"
        aria-label="Previous slide"
      >
        <FaChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#10132E]/80 border border-white/20 text-white flex items-center justify-center hover:bg-purple hover:text-black hover:border-purple transition-all backdrop-blur-md cursor-pointer shadow-md"
        aria-label="Next slide"
      >
        <FaChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
        {posts.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
              i === currentIndex
                ? "w-8 bg-purple"
                : "w-2 bg-white/30 hover:bg-white/60"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );;
};
