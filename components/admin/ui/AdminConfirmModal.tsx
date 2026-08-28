"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FaTriangleExclamation,
  FaCircleInfo,
  FaDatabase,
  FaXmark,
} from "react-icons/fa6";
import type { AdminConfirmOptions, AdminConfirmVariant } from "../context/AdminConfirmContext";

interface AdminConfirmModalProps {
  options: AdminConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  options,
  onConfirm,
  onCancel,
}) => {
  const {
    title,
    description,
    variant = "danger",
    confirmLabel,
    cancelLabel = "Cancel",
    dismissOnBackdrop = true,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Default focus to Cancel button on mount (safety measure for destructive actions)
  useEffect(() => {
    const focusTimer = requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(focusTimer);
  }, []);

  // Keyboard navigation: Escape cancels, Tab traps focus
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!isSubmitting) {
        setIsSubmitting(true);
        onCancel();
      }
      return;
    }

    if (e.key === "Tab" && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  };

  const handleConfirmClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onConfirm();
  };

  const handleCancelClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && dismissOnBackdrop && !isSubmitting) {
      setIsSubmitting(true);
      onCancel();
    }
  };

  // Semantic variant visual mapping
  const getVariantStyles = (v: AdminConfirmVariant) => {
    switch (v) {
      case "danger":
        return {
          icon: <FaTriangleExclamation className="w-4 h-4 text-[#DC2626]" />,
          iconBadge: "bg-[#FEF2F2] border-[#FECACA]",
          accentPill: "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]",
          pillText: "Destructive Action",
          confirmButton:
            "bg-[#DC2626] hover:bg-[#B91C1C] border-[#B91C1C] text-white focus-visible:ring-2 focus-visible:ring-[#DC2626]/30",
          defaultConfirmLabel: "Delete Permanently",
        };
      case "warning":
        return {
          icon: <FaTriangleExclamation className="w-4 h-4 text-[#D97706]" />,
          iconBadge: "bg-[#FFFBEB] border-[#FDE68A]",
          accentPill: "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]",
          pillText: "Irreversible Maintenance",
          confirmButton:
            "bg-[#D97706] hover:bg-[#B45309] border-[#B45309] text-white focus-visible:ring-2 focus-visible:ring-[#D97706]/30",
          defaultConfirmLabel: "Reset to Defaults",
        };
      case "purple":
        return {
          icon: <FaDatabase className="w-4 h-4 text-[#7C3AED]" />,
          iconBadge: "bg-[#F5F3FF] border-[#DDD6FE]",
          accentPill: "bg-[#F5F3FF] border-[#DDD6FE] text-[#7C3AED]",
          pillText: "System Operation",
          confirmButton:
            "bg-[#7C3AED] hover:bg-[#6D28D9] border-[#6D28D9] text-white focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30",
          defaultConfirmLabel: "Seed Baseline Data",
        };
      case "info":
      default:
        return {
          icon: <FaCircleInfo className="w-4 h-4 text-[#2563EB]" />,
          iconBadge: "bg-[#EFF6FF] border-[#BFDBFE]",
          accentPill: "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]",
          pillText: "Confirmation Required",
          confirmButton:
            "bg-[#2563EB] hover:bg-[#1D4ED8] border-[#1D4ED8] text-white focus-visible:ring-2 focus-visible:ring-[#2563EB]/30",
          defaultConfirmLabel: "Confirm",
        };
    }
  };

  const currentVariant = getVariantStyles(variant);
  const resolvedConfirmLabel = confirmLabel || currentVariant.defaultConfirmLabel;

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none select-none"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        onKeyDown={handleKeyDown}
        className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-md rounded-none sm:rounded-sm shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150 motion-reduce:animate-none relative font-admin-sans text-black"
      >
        {/* Top Bar: Variant Icon & Dismiss X */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 ${currentVariant.iconBadge}`}
            >
              {currentVariant.icon}
            </div>
            <span
              className={`px-2 py-0.5 border text-[10px] font-admin-mono uppercase tracking-wider font-bold rounded-xs ${currentVariant.accentPill}`}
            >
              {currentVariant.pillText}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black transition-colors cursor-pointer disabled:opacity-50"
          >
            <FaXmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-2">
          <h2
            id="admin-confirm-title"
            className="font-admin-sans font-bold text-base text-black leading-snug"
          >
            {title}
          </h2>
          <p
            id="admin-confirm-description"
            className="font-admin-sans text-xs text-[#475569] leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#F1F5F9]">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-admin-sans font-semibold border rounded-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-hidden ${currentVariant.confirmButton}`}
          >
            <span>{resolvedConfirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
