"use client";

import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

interface CommentFormProps {
  onSubmit: (content: string, authorName: string) => void;
  replyingTo?: { id: string; name: string } | null;
  onCancelReply?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  replyingTo,
  onCancelReply,
}) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(content.trim(), name.trim());
      setContent("");
      setName("");
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="rounded-3xl border border-white/[0.1] p-6 sm:p-8 space-y-4 mb-8 shadow-input"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          {replyingTo ? `Replying to @${replyingTo.name}` : "Leave a Comment"}
        </h4>
        {replyingTo && onCancelReply && (
          <button
            type="button"
            onClick={onCancelReply}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Cancel reply
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-purple/60 focus:bg-white/[0.07] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
          Your Comment *
        </label>
        <textarea
          required
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts or questions on this article..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-purple/60 focus:bg-white/[0.07] transition-all resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !content.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple text-black font-bold text-xs sm:text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(203,172,249,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <FaPaperPlane className="w-3 h-3" />
          {isSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </form>
  );
};
