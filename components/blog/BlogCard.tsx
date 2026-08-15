"use client";

import React from "react";
import Link from "next/link";
import { FaClock, FaCalendarAlt } from "react-icons/fa";
import { FaLocationArrow } from "react-icons/fa6";
import { BlogPost } from "@/types/blog";

interface BlogCardProps {
  post: BlogPost;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  return (
    <div
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="rounded-3xl border border-white/[0.1] hover:border-purple/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_32px_rgba(203,172,249,0.15)] hover:-translate-y-1 p-5 shadow-input"
    >
      <div>
        {/* Cover Image Container */}
        <Link
          href={`/blog/${post.slug}`}
          className="relative flex items-center justify-center w-full overflow-hidden h-48 sm:h-52 rounded-2xl mb-5 border border-white/[0.08]"
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
            className="z-10 absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Category Pill Overlay */}
          <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#10132E]/90 border border-white/20 backdrop-blur-md text-purple">
            {post.category.name}
          </div>
        </Link>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-white-200 mb-3">
          <span className="flex items-center gap-1.5">
            <FaCalendarAlt className="w-3 h-3 text-purple" />
            {post.publishedAt}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <FaClock className="w-3 h-3 text-purple" />
            {post.readingTime}
          </span>
        </div>

        {/* Title */}
        <Link href={`/blog/${post.slug}`} className="block group/title">
          <h3 className="text-lg sm:text-xl font-bold text-white group-hover/title:text-purple transition-colors duration-200 line-clamp-2 mb-2.5 leading-snug">
            {post.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-white-200 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
          {post.excerpt}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {post.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#10132E] text-white-200 border border-white/[0.08]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer with Author & CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-7 h-7 rounded-full border border-white/20 object-cover bg-black"
          />
          <span className="text-xs font-semibold text-white">
            {post.author.name}
          </span>
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="flex items-center gap-1.5 text-xs font-medium text-purple hover:text-white transition-colors duration-200 group/link"
        >
          Read
          <FaLocationArrow className="w-2.5 h-2.5 text-purple group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
        </Link>
      </div>
    </div>
  );
};
