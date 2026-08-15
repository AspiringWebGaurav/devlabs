"use client";

import React, { useState } from "react";
import { FaComments } from "react-icons/fa";
import { BlogComment } from "@/types/blog";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";

interface CommentSectionProps {
  postId: string;
  initialComments?: BlogComment[];
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialComments = [],
}) => {
  const [comments, setComments] = useState<BlogComment[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAddComment = (content: string, authorName: string) => {
    const newComment: BlogComment = {
      id: `comment-${Date.now()}`,
      postId,
      author: {
        name: authorName,
        avatar: "/profile.svg",
        role: "Community Member",
      },
      createdAt: "Just now",
      content,
      likesCount: 0,
      isLiked: false,
    };

    if (replyingTo) {
      // Add as nested reply
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === replyingTo.id) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        })
      );
      setReplyingTo(null);
    } else {
      // Add top-level comment
      setComments((prev) => [newComment, ...prev]);
    }
  };

  const handleReplyClick = (commentId: string, authorName: string) => {
    setReplyingTo({ id: commentId, name: authorName });
    const formEl = document.getElementById("comment-form-section");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="comments-section" className="my-16 pt-12 border-t border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/15 text-purple border border-purple/30 flex items-center justify-center">
            <FaComments className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Discussion ({comments.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Join the conversation and share your feedback
            </p>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      <div id="comment-form-section">
        <CommentForm
          onSubmit={handleAddComment}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReplyClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 rounded-2xl border border-white/[0.06] bg-white/[0.01]">
          <p className="text-sm text-neutral-400">
            No comments yet. Be the first to start the discussion!
          </p>
        </div>
      )}
    </section>
  );
};
