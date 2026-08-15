"use client";

import React, { useState } from "react";
import { FaHeart, FaRegHeart, FaReply } from "react-icons/fa";
import { BlogComment } from "@/types/blog";
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: BlogComment;
  onReply?: (commentId: string, authorName: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
}) => {
  const [likes, setLikes] = useState(comment.likesCount);
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);

  const handleToggleLike = () => {
    if (isLiked) {
      setLikes((prev) => prev - 1);
      setIsLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setIsLiked(true);
    }
  };

  return (
    <div
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
      className="rounded-2xl border border-white/[0.1] p-4 sm:p-6 space-y-3.5 transition-all shadow-input"
    >
      {/* Header with Avatar & Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={comment.author.avatar}
            alt={comment.author.name}
            className="w-9 h-9 rounded-full border border-purple/30 object-cover bg-black"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {comment.author.name}
              </span>
              {comment.author.role && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple/20 text-purple border border-purple/30">
                  {comment.author.role}
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-400">
              {comment.createdAt}
            </span>
          </div>
        </div>

        {/* Like Button */}
        <button
          onClick={handleToggleLike}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
            isLiked
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
              : "bg-white/[0.03] text-neutral-400 border-white/10 hover:text-white hover:border-white/20"
          )}
          aria-label="Like comment"
        >
          {isLiked ? (
            <FaHeart className="w-3 h-3 text-rose-500 animate-bounce" />
          ) : (
            <FaRegHeart className="w-3 h-3" />
          )}
          <span>{likes}</span>
        </button>
      </div>

      {/* Content */}
      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pl-12">
        {comment.content}
      </p>

      {/* Action footer */}
      {onReply && (
        <div className="pl-12 pt-1 flex items-center">
          <button
            onClick={() => onReply(comment.id, comment.author.name)}
            className="inline-flex items-center gap-1.5 text-xs text-purple font-medium hover:text-white transition-colors cursor-pointer"
          >
            <FaReply className="w-3 h-3" />
            Reply
          </button>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 sm:pl-10 space-y-3 pt-3 border-l-2 border-purple/20 mt-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
};
