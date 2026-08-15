"use client";

import React from "react";
import Link from "next/link";
import { FaClock, FaCalendarAlt, FaStar } from "react-icons/fa";
import { FaLocationArrow } from "react-icons/fa6";
import { BlogPost } from "@/types/blog";

interface FeaturedPostCardProps {
  post: BlogPost;
}

export const FeaturedPostCard: React.FC<FeaturedPostCardProps> = ({ post }) => {
  return (
    <div
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="relative mb-14 rounded-3xl border border-white/[0.1] hover:border-purple/50 transition-all duration-300 overflow-hidden group shadow-input p-6 sm:p-8 lg:p-10"
    >
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Cover Image with RecentProjects bg container */}
        <Link
          href={`/blog/${post.slug}`}
          className="w-full lg:w-1/2 relative rounded-2xl overflow-hidden aspect-[16/10] border border-white/[0.1] group-hover:border-purple/40 transition-colors flex items-center justify-center"
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
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10132E]/90 backdrop-blur-md border border-purple/40 text-purple text-xs font-semibold">
            <FaStar className="w-3 h-3 text-purple" />
            Featured Article
          </div>
        </Link>

        {/* Content Details */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between">
          <div>
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
              <span className="px-3 py-1 rounded-xl bg-[#10132E] text-purple font-semibold border border-white/[0.08]">
                {post.category.name}
              </span>
              <span className="flex items-center gap-1.5 text-white-200">
                <FaCalendarAlt className="w-3 h-3 text-purple" />
                {post.publishedAt}
              </span>
              <span className="text-white-200">·</span>
              <span className="flex items-center gap-1.5 text-white-200">
                <FaClock className="w-3 h-3 text-purple" />
                {post.readingTime}
              </span>
            </div>

            {/* Title */}
            <Link href={`/blog/${post.slug}`} className="group/title block">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white group-hover/title:text-purple transition-colors duration-200 leading-tight mb-4">
                {post.title}
              </h2>
            </Link>

            {/* Subtitle / Excerpt */}
            <p className="text-white-200 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3">
              {post.excerpt}
            </p>
          </div>

          {/* Footer & Author */}
          <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
            <div className="flex items-center gap-3">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-10 h-10 rounded-full border border-white/20 object-cover bg-black-100"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  {post.author.name}
                </p>
                <p className="text-xs text-white-200">{post.author.role}</p>
              </div>
            </div>

            <Link
              href={`/blog/${post.slug}`}
              className="flex items-center gap-2 text-xs sm:text-sm text-purple hover:text-white transition-colors duration-200 font-medium group/link"
            >
              Read Article
              <FaLocationArrow className="w-3 h-3 text-purple group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
