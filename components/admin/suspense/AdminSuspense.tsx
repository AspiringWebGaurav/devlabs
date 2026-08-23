"use client";

import React, { Suspense, ReactNode } from "react";
import { AdminErrorBoundary } from "../error/AdminErrorBoundary";
import { AdminOverviewSkeleton } from "../skeletons/AdminOverviewSkeleton";

interface AdminSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
}

export const AdminSuspense: React.FC<AdminSuspenseProps> = ({
  children,
  fallback = <AdminOverviewSkeleton />,
  fallbackTitle,
}) => {
  return (
    <AdminErrorBoundary fallbackTitle={fallbackTitle}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </AdminErrorBoundary>
  );
};
