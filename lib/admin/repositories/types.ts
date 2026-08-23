export interface RepositoryResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  timestamp: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PortfolioServiceItem {
  id: string;
  name: string;
  status: "operational" | "degraded" | "maintenance" | "inactive";
  endpoint: string;
  latencyMs: number;
  lastChecked: string;
  version: string;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt: string;
  status: "unread" | "read" | "archived";
}
