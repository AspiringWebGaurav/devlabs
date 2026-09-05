"use client";

import React from "react";
import Link from "next/link";

interface MarkdownLegalRendererProps {
  content: string;
  className?: string;
}

export function MarkdownLegalRenderer({ content, className = "" }: MarkdownLegalRendererProps) {
  if (!content) return null;

  // Split into paragraphs / blocks
  const blocks = content.split(/\n\n+/);

  const formatInline = (text: string): React.ReactNode => {
    // Matches **bold**, `code`, [label](url), and raw email
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const raw = match[0];

      if (raw.startsWith("**") && raw.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="text-white font-semibold">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        parts.push(
          <code key={match.index} className="text-purple font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-xs sm:text-sm">
            {raw.slice(1, -1)}
          </code>
        );
      } else if (raw.startsWith("[") && raw.includes("](") && raw.endsWith(")")) {
        const labelEnd = raw.indexOf("](");
        const label = raw.slice(1, labelEnd);
        const url = raw.slice(labelEnd + 2, -1);
        parts.push(
          <Link
            key={match.index}
            href={url}
            className="text-purple hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {label}
          </Link>
        );
      } else if (raw.includes("@") && !raw.startsWith("http")) {
        parts.push(
          <a
            key={match.index}
            href={`mailto:${raw}`}
            className="text-purple hover:underline font-medium"
          >
            {raw}
          </a>
        );
      } else {
        parts.push(raw);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className={`space-y-3.5 text-neutral-300 leading-relaxed text-sm sm:text-base ${className}`}>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();

        // Level 3 Heading (### )
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-semibold text-white pt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple shrink-0" />
              {formatInline(trimmed.slice(4))}
            </h3>
          );
        }

        // Level 2 Heading (## )
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-lg sm:text-xl font-bold text-white pt-3 border-t border-white/[0.06]">
              {formatInline(trimmed.slice(3))}
            </h2>
          );
        }

        // Bulleted List (- item or * item)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n[-*]\s+/).map((item) => item.replace(/^[-*]\s+/, ""));
          return (
            <ul key={idx} className="list-disc list-inside space-y-2 pl-2 text-sm sm:text-base">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-neutral-300">
                  {formatInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered List (1. item)
        if (/^\d+\.\s+/.test(trimmed)) {
          const items = trimmed.split(/\n\d+\.\s+/).map((item) => item.replace(/^\d+\.\s+/, ""));
          return (
            <ol key={idx} className="list-decimal list-inside space-y-2 pl-2 text-sm sm:text-base">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-neutral-300">
                  {formatInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-neutral-300">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
