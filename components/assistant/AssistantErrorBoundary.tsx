"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Isolated React Error Boundary for the Assistant Subsystem.
 * Prevents any runtime exceptions in the Assistant subtree from propagating to the host portfolio.
 */
export class AssistantErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[AssistantErrorBoundary] Caught assistant runtime exception:", error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
