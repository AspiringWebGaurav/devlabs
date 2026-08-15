"use client";

import React, { useState } from "react";
import { FaCopy, FaCheck, FaQuoteLeft, FaCode } from "react-icons/fa";
import { BlogPost, ArticleSection } from "@/types/blog";
import { ArticleGallery } from "./ArticleGallery";

interface ArticleContentProps {
  post: BlogPost;
}

export const ArticleContent: React.FC<ArticleContentProps> = ({ post }) => {
  return (
    <article className="text-neutral-300 leading-relaxed text-base sm:text-lg space-y-10">
      {/* Intro Paragraph */}
      {post.content.intro && (
        <p className="text-lg sm:text-xl text-white font-medium leading-relaxed border-l-2 border-purple pl-4 italic">
          {post.content.intro}
        </p>
      )}

      {/* Main Sections */}
      {post.content.sections.map((section: ArticleSection) => (
        <section
          key={section.id}
          id={section.id}
          className="space-y-5 pt-4 scroll-mt-28"
        >
          {/* Section Heading */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight pb-2 border-b border-white/[0.08]">
            {section.heading}
          </h2>

          {/* Paragraphs */}
          {section.paragraphs.map((p, pIdx) => (
            <p key={pIdx} className="text-neutral-300 leading-relaxed text-sm sm:text-base">
              {p}
            </p>
          ))}

          {/* Pull Quote Block */}
          {section.quote && (
            <figure className="my-8 p-6 sm:p-8 rounded-2xl border border-purple/30 bg-purple/[0.04] relative">
              <FaQuoteLeft className="w-8 h-8 text-purple/30 mb-3" />
              <blockquote className="text-base sm:text-lg text-white font-medium italic mb-3 leading-relaxed">
                &ldquo;{section.quote.text}&rdquo;
              </blockquote>
              {section.quote.caption && (
                <figcaption className="text-xs font-semibold text-purple uppercase tracking-wider">
                  — {section.quote.caption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Code Block Snippet */}
          {section.codeSnippet && (
            <CodeBlockSnippet snippet={section.codeSnippet} />
          )}

          {/* Embedded Gallery */}
          {section.gallery && section.gallery.length > 0 && (
            <ArticleGallery images={section.gallery} />
          )}
        </section>
      ))}

      {/* Conclusion */}
      {post.content.conclusion && (
        <section className="pt-6 border-t border-white/[0.08] space-y-4">
          <h2 className="text-2xl font-bold text-white">Summary & Takeaways</h2>
          <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
            {post.content.conclusion}
          </p>
        </section>
      )}
    </article>
  );
};

const CodeBlockSnippet: React.FC<{
  snippet: {
    language: string;
    code: string;
    filename?: string;
  };
}> = ({ snippet }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy code", e);
    }
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-[#06091F] shadow-xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.08] text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <FaCode className="w-3.5 h-3.5 text-purple" />
          <span className="font-mono font-medium text-neutral-300">
            {snippet.filename || snippet.language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-purple hover:text-black transition-all text-neutral-300 text-xs cursor-pointer"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <FaCheck className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <FaCopy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Pre Area */}
      <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono overflow-x-auto text-neutral-200 leading-relaxed scrollbar-thin">
        <code>{snippet.code}</code>
      </pre>
    </div>
  );
};
