"use client";

import React from "react";
import Link from "next/link";

interface MarkdownLegalRendererProps {
  content: string;
  className?: string;
}

type ParsedBlock =
  | { type: "h1"; content: string }
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

/**
 * Deterministic line-by-line Markdown block parser.
 * Accurately segments headings, contiguous lists, and paragraphs regardless
 * of single vs. double newline formatting, preventing CSS flex container blowouts.
 */
function parseMarkdownBlocks(rawMarkdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = rawMarkdown.replace(/\r\n/g, "\n").split("\n");

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        content: currentParagraphLines.join(" ").trim(),
      });
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Blank line -> flush active paragraph or list
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // 2. Heading 3 (### )
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", content: trimmed.slice(4).trim() });
      continue;
    }

    // 3. Heading 2 (## )
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", content: trimmed.slice(3).trim() });
      continue;
    }

    // 4. Heading 1 (# )
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", content: trimmed.slice(2).trim() });
      continue;
    }

    // 5. Unordered list item (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[1].trim());
      continue;
    }

    // 6. Ordered list item (1. )
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[1].trim());
      continue;
    }

    // 7. Indented list item continuation
    if (currentList && (rawLine.startsWith("  ") || rawLine.startsWith("\t"))) {
      if (currentList.items.length > 0) {
        currentList.items[currentList.items.length - 1] += " " + trimmed;
      } else {
        currentList.items.push(trimmed);
      }
      continue;
    }

    // 8. If inside a list but encountered non-indented normal text, terminate list
    if (currentList) {
      flushList();
    }

    // 9. Standard paragraph line
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function MarkdownLegalRenderer({ content, className = "" }: MarkdownLegalRendererProps) {
  if (!content) return null;

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

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-3.5 text-neutral-300 leading-relaxed text-sm sm:text-base ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-semibold text-white pt-2.5 pb-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple shrink-0" />
              <span className="flex-1 min-w-0">{formatInline(block.content)}</span>
            </h3>
          );
        }

        if (block.type === "h2") {
          return (
            <h2 key={idx} className="text-lg sm:text-xl font-bold text-white pt-4 pb-0.5 border-t border-white/[0.06]">
              <span>{formatInline(block.content)}</span>
            </h2>
          );
        }

        if (block.type === "h1") {
          return (
            <h1 key={idx} className="text-xl sm:text-2xl font-bold text-white pt-4 pb-1">
              <span>{formatInline(block.content)}</span>
            </h1>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={idx} className="list-disc list-inside space-y-2 pl-2 text-sm sm:text-base text-neutral-300">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <span>{formatInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={idx} className="list-decimal list-inside space-y-2 pl-2 text-sm sm:text-base text-neutral-300">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <span>{formatInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-neutral-300 leading-relaxed text-sm sm:text-base">
            {formatInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}
