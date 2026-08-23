"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { FaTriangleExclamation, FaRotateRight } from "react-icons/fa6";
import { adminLogger } from "@/lib/admin/logger";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    adminLogger.error("AdminErrorBoundary:componentDidCatch", error, "Widget crashed", {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 bg-[#FFFFFF] border border-[#FCA5A5] rounded-none sm:rounded-sm space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
              <FaTriangleExclamation className="w-3.5 h-3.5 text-[#DC2626]" />
            </div>
            <div className="min-w-0">
              <h4 className="font-admin-sans font-bold text-sm text-black">
                {this.props.fallbackTitle || "Component Load Error"}
              </h4>
              <p className="font-admin-mono text-[11px] text-[#64748B] mt-0.5 truncate">
                {this.state.error?.message || "An isolated widget error occurred."}
              </p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              onClick={this.handleRetry}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono font-semibold bg-[#FAFAFA] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-black rounded-sm transition-colors cursor-pointer"
            >
              <FaRotateRight className="w-3 h-3 text-[#7C3AED]" />
              <span>Retry Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
