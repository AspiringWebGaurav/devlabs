"use client";

import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaCalendarAlt, FaClock, FaTag } from "react-icons/fa";
import { BlogPost } from "@/types/blog";

interface ArticleHeaderProps {
  post: BlogPost;
}

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({ post }) => {
  return (
    <header className="mb-12">
      {/* Back Link */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-purple hover:text-white transition-colors duration-200 group"
        >
          <FaArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1.5" />
          Back to all articles
        </Link>
      </div>

      {/* Category & Metadata */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="px-3.5 py-1 rounded-xl text-xs font-semibold bg-[#10132E] text-purple border border-white/[0.08]">
          {post.category.name}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white-200">
          <FaCalendarAlt className="w-3 h-3 text-purple" />
          {post.publishedAt}
        </span>
        <span className="text-white-200">·</span>
        <span className="flex items-center gap-1.5 text-xs text-white-200">
          <FaClock className="w-3 h-3 text-purple" />
          {post.readingTime}
        </span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-4">
        {post.title}
      </h1>

      {/* Subtitle */}
      {post.subtitle && (
        <p className="text-white-200 text-base sm:text-lg md:text-xl leading-relaxed mb-8 max-w-4xl">
          {post.subtitle}
        </p>
      )}

      {/* Author Card */}
      <div className="flex items-center justify-between py-6 border-y border-white/[0.08] mb-10">
        <div className="flex items-center gap-3.5">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-12 h-12 rounded-full border border-white/20 object-cover bg-black-100"
          />
          <div>
            <p className="text-sm font-bold text-white">
              {post.author.name}
            </p>
            <p className="text-xs text-white-200">{post.author.role}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {post.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-[#10132E] border border-white/[0.08] text-white-200"
            >
              <FaTag className="w-2.5 h-2.5 text-purple" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Cover Image with Glassmorphism Border */}
      <div
        className="relative w-full rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] border border-white/[0.1] shadow-input flex items-center justify-center"
        style={{ backgroundColor: "#13162D" }}
      >
        <img
          src="/bg.png"
          alt="bg"
          className="w-full h-full object-cover opacity-60"
        />
        <img
          src={post.coverImage}
          alt={post.title}
          className="z-10 absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>
    </header>
  );
};
