export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "editor";
  avatar?: string;
  issuedAt?: number;
  expiresAt?: number;
  lastActiveAt?: number;
}

export interface AdminSession {
  user: AdminUser | null;
  isAuthenticated: boolean;
  token?: string;
  expiresInMs?: number;
}

export interface DatabaseStats {
  postsCount: number;
  projectsCount: number;
  messagesCount: number;
  subscribersCount: number;
  telemetryCount: number;
  visitorsCount?: number;
  sessionsCount?: number;
  cacheKeysCount: number;
  databaseStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  storageUsedBytes: number;
  lastPurgedAt: string | null;
  isPurged: boolean;
  redisLatencyMs: number;
  databaseType?: "Firestore" | "RealtimeDB";
  collections?: {
    visitors: number;
    visitor_sessions: number;
    visitor_appeals?: number;
    posts: number;
    projects: number;
    messages: number;
    subscribers: number;
  };
}

export interface AdminMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  category: "productivity" | "traffic" | "content" | "system";
  detail: string;
}

export interface AdminTimeSeriesPoint {
  date: string;
  views: number;
  deepFocusHours: number;
  sessions: number;
}

export interface AdminActivityItem {
  id: string;
  type: "post_published" | "post_drafted" | "project_updated" | "login";
  title: string;
  timestamp: string;
  actor: string;
  meta?: string;
}

export interface AdminPostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readTime: string;
  published: boolean;
}

export interface AdminSecurityConfig {
  requireEmailOtp: boolean;
  requireTotp: boolean;
  wipeOtpRequired: boolean;
  updatedAt?: number;
}

