export type DeviceType = "desktop" | "mobile" | "tablet";

export interface GeoLocation {
  country: string;
  state: string;
  city: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  asn?: string;
}

export interface DeviceInfo {
  type: DeviceType;
  os: string;
  osVersion?: string;
  architecture?: string;
}

export interface BrowserInfo {
  name: string;
  version?: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
  colorScheme: "light" | "dark";
  touch: boolean;
}

export interface VisitorBan {
  enabled: boolean;
  reason?: string;
  bannedAt?: number; // Unix timestamp in ms
  bannedBy?: string;
}

export interface Visitor {
  id: string; // Document ID === Visitor ID (e.g. vst_9X2A8KLMQ4P7)
  machineHash?: string; // Hardware machine fingerprint hash (mfp_...)
  machineHashes?: string[]; // All linked machine hashes for multi-browser mapping
  firstSeen: number;
  lastSeen: number;
  totalVisits: number;
  totalPages: number;
  online: boolean;
  currentPath: string;
  referrer?: string;
  currentIP: string;
  ipHistory: string[];
  geo: GeoLocation;
  device: DeviceInfo;
  browser: BrowserInfo;
  viewport?: ViewportInfo;
  activeSessionId?: string;
  ban: VisitorBan;
  createdAt: number;
  updatedAt: number;
}

export interface VisitorSession {
  sessionId: string;
  visitorId: string;
  machineHash?: string;
  connectedAt: number;
  disconnectedAt?: number;
  currentPath: string;
  ip: string;
  userAgent: string;
  online: boolean;
}

export type AppealStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";

export interface VisitorAppeal {
  id: string; // app_...
  visitorId: string;
  machineHash?: string;
  ip?: string;
  email: string;
  name?: string;
  message: string;
  banReason?: string;
  status: AppealStatus;
  submittedAt: number;
  reviewedAt?: number;
  adminNotes?: string;
}

export type VisitorEventType =
  | "VISITOR_CONNECTED"
  | "VISITOR_UPDATED"
  | "VISITOR_DISCONNECTED"
  | "VISITOR_BANNED"
  | "VISITOR_UNBANNED"
  | "VISITOR_DELETED"
  | "APPEAL_CREATED"
  | "APPEAL_UPDATED";

export interface VisitorEventPayload {
  type: VisitorEventType;
  visitorId: string;
  timestamp: number;
  visitor?: Visitor;
  session?: VisitorSession;
  appeal?: VisitorAppeal;
  reason?: string;
}

export interface VisitorStatsSummary {
  onlineNow: number;
  totalUnique: number;
  todayVisitors: number;
  returningVisitors: number;
  deviceDistribution: Record<string, number>;
  browserDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
  dailyVisitors: Array<{ date: string; count: number }>;
}
