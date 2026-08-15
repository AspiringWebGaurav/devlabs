"use client";

import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface ArticleGalleryProps {
  images: string[];
  caption?: string;
  autoPlayInterval?: number;
}

export const ArticleGallery: React.FC<ArticleGalleryProps> = ({
  images,
  caption,
  autoPlayInterval = 4000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [images.length, isPaused, autoPlayInterval]);

  if (!images || images.length === 0) return null;

  return (
    <div
      className="my-10 rounded-2xl overflow-hidden border border-white/10 bg-[#04071D] p-2 relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/60">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Slide ${idx + 1}`}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
              idx === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          />
        ))}

        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex(
                  (prev) => (prev - 1 + images.length) % images.length
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-purple hover:text-black transition-all cursor-pointer backdrop-blur-md"
              aria-label="Previous image"
            >
              <FaChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev + 1) % images.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-purple hover:text-black transition-all cursor-pointer backdrop-blur-md"
              aria-label="Next image"
            >
              <FaChevronRight className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails / Dots */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 pb-1">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                i === currentIndex
                  ? "w-6 bg-purple"
                  : "w-2 bg-white/20 hover:bg-white/50"
              )}
              aria-label={`Select slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {caption && (
        <p className="text-center text-xs text-neutral-400 mt-2 italic">
          {caption}
        </p>
      )}
    </div>
  );
};
