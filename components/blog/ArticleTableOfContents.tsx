"use client";

import React, { useEffect, useState } from "react";
import { FaListUl } from "react-icons/fa";
import { ArticleSection } from "@/types/blog";
import { cn } from "@/lib/utils";

interface ArticleTableOfContentsProps {
  sections: ArticleSection[];
}

export const ArticleTableOfContents: React.FC<ArticleTableOfContentsProps> = ({
  sections,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -60% 0%",
        threshold: 0.1,
      }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!sections || sections.length === 0) return null;

  return (
    <div
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="rounded-2xl border border-white/[0.1] p-5 shadow-input sticky top-28"
    >
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/[0.08] text-xs font-bold uppercase tracking-wider text-purple">
        <FaListUl className="w-3.5 h-3.5" />
        Table of Contents
      </div>

      <ul className="space-y-2 text-xs leading-relaxed">
        {sections.map((section) => {
          const isActive = activeSectionId === section.id;
          return (
            <li key={section.id}>
              <button
                onClick={() => handleScrollTo(section.id)}
                className={cn(
                  "text-left block w-full py-1.5 px-2.5 rounded-lg transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-purple/15 text-purple font-semibold border-l-2 border-purple pl-3"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                {section.heading}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
