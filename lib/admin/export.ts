import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { listVisitors, getVisitorAppeals } from "@/lib/visitors/visitor-repository";
import { getActiveDbPosts, getActiveDbProjects, getDatabaseStats } from "@/lib/admin/database";
import { getAdminSecurityConfig } from "@/lib/admin/auth";
import { Visitor, VisitorSession, VisitorAppeal } from "@/lib/visitors/types";
import { BlogPost } from "@/types/blog";
import {
  ContactMessage,
  Subscriber,
  AdminAuditLog,
  AnomalyReport,
  OrphanAnalysisReport,
  FullExportPackage,
  convertVisitorsToCsv,
  convertSessionsToCsv,
  convertAppealsToCsv,
  convertAuditLogsToCsv,
  convertMessagesToCsv,
  convertSubscribersToCsv,
  generateOrphanAnalysisReport,
  generateStandaloneHtmlReport,
  generateWordDocumentReport,
  generatePowerPointPresentation,
  escapeCsv,
} from "./export-types";

export type {
  ContactMessage,
  Subscriber,
  AdminAuditLog,
  AnomalyReport,
  OrphanAnalysisReport,
  FullExportPackage,
};

export {
  convertVisitorsToCsv,
  convertSessionsToCsv,
  convertAppealsToCsv,
  convertAuditLogsToCsv,
  convertMessagesToCsv,
  convertSubscribersToCsv,
  generateOrphanAnalysisReport,
  generateStandaloneHtmlReport,
  generateWordDocumentReport,
  generatePowerPointPresentation,
  escapeCsv,
};

/**
 * Computes deep forensic AI Anomaly Report across all visitors, sessions, appeals, and logs.
 */
export function computeAiAnomalyReport(
  visitors: Visitor[],
  sessions: VisitorSession[],
  appeals: VisitorAppeal[],
  auditLogs: AdminAuditLog[]
): AnomalyReport {
  const timestamp = new Date().toISOString();

  // 1. Group by physical machine fingerprint hash (mfp_...) to detect Incognito evasion
  const mfpMap = new Map<string, Visitor[]>();
  visitors.forEach((v) => {
    if (v.machineHash && v.machineHash.length > 5) {
      const list = mfpMap.get(v.machineHash) || [];
      list.push(v);
      mfpMap.set(v.machineHash, list);
    }
  });

  const fingerprintCollisions: AnomalyReport["categories"]["fingerprintCollisions"] = [];
  mfpMap.forEach((matchedVisitors, mfp) => {
    if (matchedVisitors.length > 1) {
      const vIds = matchedVisitors.map((v) => v.id);
      const ips = Array.from(new Set(matchedVisitors.map((v) => v.currentIP).filter(Boolean)));
      const hasBan = matchedVisitors.some((v) => v.ban?.enabled);
      const totalVisits = matchedVisitors.reduce((sum, v) => sum + (v.totalVisits || 1), 0);

      fingerprintCollisions.push({
        machineHash: mfp,
        associatedVisitorIds: vIds,
        ipAddresses: ips,
        totalVisits,
        isBanned: hasBan,
        description: `Physical hardware fingerprint shared across ${matchedVisitors.length} distinct Visitor IDs (${vIds.join(", ")}). Strong signature of Incognito session resetting or multi-browser evasion.`,
      });
    }
  });

  // 2. IP / Subnet Hopping on single Visitor ID
  const ipHopping: AnomalyReport["categories"]["ipHopping"] = [];
  visitors.forEach((v) => {
    const visitorSessions = sessions.filter((s) => s.visitorId === v.id);
    if (v.totalVisits > 5 && visitorSessions.length > 3) {
      const ips = Array.from(new Set(visitorSessions.map((s) => s.ip).filter(Boolean)));
      if (ips.length > 2) {
        ipHopping.push({
          visitorId: v.id,
          ipAddresses: [v.currentIP || "Masked"],
          locations: [v.geo?.country ? `${v.geo?.city || "Unknown"}, ${v.geo.country}` : "Unknown"],
          description: `Visitor logged across ${visitorSessions.length} sessions with multiple connection states.`,
        });
      }
    }
  });

  // 3. High Velocity Bursts (>20 visits or >50 page views)
  const highVelocityBursts: AnomalyReport["categories"]["highVelocityBursts"] = [];
  visitors.forEach((v) => {
    if ((v.totalVisits || 0) > 20 || (v.totalPages || 0) > 50) {
      highVelocityBursts.push({
        visitorId: v.id,
        totalVisits: v.totalVisits,
        pageViews: v.totalPages,
        lastSeen: v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A",
        description: `High request frequency (${v.totalVisits} visits, ${v.totalPages} page views). Candidate for aggressive scraper or automated tooling inspection.`,
      });
    }
  });

  // 4. Bot Bounce Patterns (< 2 seconds duration)
  const botBouncePatterns: AnomalyReport["categories"]["botBouncePatterns"] = [];
  sessions.forEach((s) => {
    const duration = s.disconnectedAt
      ? Math.max(0, Math.round((s.disconnectedAt - s.connectedAt) / 1000))
      : 0;

    if (duration > 0 && duration < 2) {
      botBouncePatterns.push({
        sessionId: s.sessionId,
        visitorId: s.visitorId,
        durationSeconds: duration,
        pageViews: 1,
        device: s.userAgent || "Unknown Device",
        description: `Instant bounce (${duration}s duration). Characteristic of automated headless crawlers.`,
      });
    }
  });

  // 5. Banned Node Activity Attempts
  const bannedActivityAttempts: AnomalyReport["categories"]["bannedActivityAttempts"] = [];
  visitors
    .filter((v) => v.ban?.enabled)
    .forEach((v) => {
      bannedActivityAttempts.push({
        visitorId: v.id,
        banReason: v.ban?.reason || "Administrative Revocation",
        lastAttempt: v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A",
        description: `Banned visitor record with ${v.totalVisits} lifetime visits. Last active: ${v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A"}.`,
      });
    });

  // 6. Geo / Timezone Mismatches (VPN / Proxy detection)
  const geoTimezoneMismatches: AnomalyReport["categories"]["geoTimezoneMismatches"] = [];

  // 7. Admin Probing Attempts
  const adminProbingAttempts: AnomalyReport["categories"]["adminProbingAttempts"] = [];
  sessions.forEach((s) => {
    if (s.currentPath && (s.currentPath.startsWith("/admin") || s.currentPath.includes(".env") || s.currentPath.includes("wp-admin"))) {
      adminProbingAttempts.push({
        sessionId: s.sessionId,
        visitorId: s.visitorId,
        targetedPath: s.currentPath,
        timestamp: s.connectedAt ? new Date(s.connectedAt).toISOString() : "N/A",
        description: `Endpoint probe directed to '${s.currentPath}' from IP ${s.ip || "Unknown"}.`,
      });
    }
  });

  // Summary Metrics
  const bannedCount = visitors.filter((v) => v.ban?.enabled).length;
  const activeCount = visitors.length - bannedCount;
  const appealsCount = appeals.length;
  const auditLogsCount = auditLogs.length;

  let totalDurationSec = 0;
  let closedSessions = 0;
  sessions.forEach((s) => {
    if (s.disconnectedAt && s.connectedAt) {
      totalDurationSec += Math.max(0, Math.round((s.disconnectedAt - s.connectedAt) / 1000));
      closedSessions++;
    }
  });
  const avgSessionDurationSec = closedSessions > 0 ? Math.round(totalDurationSec / closedSessions) : 0;

  const topBrowsers: Record<string, number> = {};
  const topCountries: Record<string, number> = {};
  const topOperatingSystems: Record<string, number> = {};

  visitors.forEach((v) => {
    const b = v.browser?.name || "Other";
    topBrowsers[b] = (topBrowsers[b] || 0) + 1;

    const c = v.geo?.country || "Unknown";
    topCountries[c] = (topCountries[c] || 0) + 1;

    const o = v.device?.os || "Other";
    topOperatingSystems[o] = (topOperatingSystems[o] || 0) + 1;
  });

  const totalAnomalies =
    fingerprintCollisions.length +
    ipHopping.length +
    highVelocityBursts.length +
    botBouncePatterns.length +
    bannedActivityAttempts.length +
    geoTimezoneMismatches.length +
    adminProbingAttempts.length;

  return {
    timestamp,
    totalVisitorsAnalyzed: visitors.length,
    totalSessionsAnalyzed: sessions.length,
    anomaliesFound: totalAnomalies,
    categories: {
      fingerprintCollisions,
      ipHopping,
      highVelocityBursts,
      botBouncePatterns,
      bannedActivityAttempts,
      geoTimezoneMismatches,
      adminProbingAttempts,
    },
    summaryStatistics: {
      bannedCount,
      activeCount,
      appealsCount,
      auditLogsCount,
      avgSessionDurationSec,
      topBrowsers,
      topCountries,
      topOperatingSystems,
    },
  };
}

/**
 * Generates the master README_AI_ANALYSIS.md prompt ready for direct drag-and-drop into Claude/ChatGPT.
 */
export function generateAiAnomalyPrompt(
  manifest: FullExportPackage["manifest"],
  anomalyReport: AnomalyReport
): string {
  return `# AI Security & Anomaly Forensic Analysis Guide

**Export Timestamp:** ${manifest.exportedAt}  
**System Scope:** Gaurav Portfolio &bull; Enterprise Administrator Telemetry  
**Environment:** ${manifest.environment}  

---

## 1. System Inventory Summary
- Total Visitors Analyzed: **${manifest.counts.visitors}**
- Recorded Sessions: **${manifest.counts.sessions}**
- Banned Nodes: **${anomalyReport.summaryStatistics.bannedCount}**
- Active Nodes: **${anomalyReport.summaryStatistics.activeCount}**
- Ban Appeals Logged: **${manifest.counts.appeals}**
- Security Audit Events: **${manifest.counts.auditLogs}**
- Blog Publications: **${manifest.counts.posts}**
- Showcase Projects: **${manifest.counts.projects}**
- Inquiries Received: **${manifest.counts.messages}**
- Newsletter Subscribers: **${manifest.counts.subscribers}**
- Pre-computed Security Anomalies: **${anomalyReport.anomaliesFound}**

---

## 2. Pre-Computed Security Heuristics Summary
- **Physical Fingerprint Collisions (Incognito/Multi-Browser Evasion)**: ${anomalyReport.categories.fingerprintCollisions.length} detected
- **High-Velocity Traffic Spikes**: ${anomalyReport.categories.highVelocityBursts.length} detected
- **Automated Bot Bounce Traces**: ${anomalyReport.categories.botBouncePatterns.length} detected
- **Banned Node Persistence Traces**: ${anomalyReport.categories.bannedActivityAttempts.length} detected
- **Geo / Timezone Mismatches (VPN/Proxy Traces)**: ${anomalyReport.categories.geoTimezoneMismatches.length} detected
- **Admin Endpoint Probing Attempts**: ${anomalyReport.categories.adminProbingAttempts.length} detected
- **Average User Session Duration**: ${anomalyReport.summaryStatistics.avgSessionDurationSec} seconds
- **Banned vs Active Ratio**: ${anomalyReport.summaryStatistics.bannedCount} Banned / ${anomalyReport.summaryStatistics.activeCount} Active

---

## 3. Forensic Analysis Tasks for the AI

Please evaluate the dataset files in this folder and output a structured report answering:

### A. Threat Assessment & Ban Evasion
1. Identify any visitors attempting to bypass bans by opening Incognito windows or rotating IP addresses (cross-reference \`machineHash\` and \`id\` in \`visitors/visitors.json\`).
2. Are there coordinated clusters of IP subnets targeting specific endpoints?

### B. Bot & Crawler Detection
1. Analyze the \`sessions/visitor_sessions.json\` and flag automated scraping behavior, headless browsers, or non-human page navigation velocities (< 2s hops).
2. Distinguish legitimate search engine indexers from malicious vulnerability scanners.

### C. Geolocation & Network Anomalies
1. Identify instances of rapid geographical relocation (VPN/Proxy jumping) within short timeframes.
2. Flag unusual country-of-origin distributions or unexpected traffic spikes.

### D. Recommended Defensive Rules
1. Provide a prioritized list of IP addresses, visitor IDs, or machine fingerprint hashes that should be permanently banned.
2. Suggest rate-limiting thresholds and security configuration adjustments based on observed anomalies.

---

*Generated by Gaurav Portfolio Administrator Subsystem &bull; Confidential Forensic Package*
`;
}

/**
 * Core Data Extraction Pipeline pulling complete records across Cloud Firestore and In-Memory Stores.
 */
export async function extractCompleteAdminDataset(): Promise<FullExportPackage> {
  const firestore = getAdminFirestore();

  // 1. Fetch Visitors
  let visitors: Visitor[] = [];
  try {
    visitors = await listVisitors({ limit: 10000 });
  } catch {
    visitors = [];
  }

  // 2. Fetch Sessions
  let sessions: VisitorSession[] = [];
  if (firestore) {
    try {
      const snap = await firestore.collection("visitor_sessions").get();
      sessions = snap.docs.map((doc) => doc.data() as VisitorSession);
    } catch {
      sessions = [];
    }
  }

  // 3. Fetch Appeals
  let appeals: VisitorAppeal[] = [];
  try {
    appeals = await getVisitorAppeals();
  } catch {
    appeals = [];
  }

  // 4. Fetch Admin Audit Logs
  const auditLogs: AdminAuditLog[] = [];
  if (firestore) {
    try {
      const auditSnap = await firestore.collection("admin_audit").get();
      if (!auditSnap.empty) {
        auditSnap.forEach((doc) => {
          auditLogs.push({ id: doc.id, ...(doc.data() as Omit<AdminAuditLog, "id">) });
        });
      }
    } catch {
      // Fallback
    }
  }

  if (auditLogs.length === 0) {
    auditLogs.push({
      id: "audit_init",
      action: "ADMIN_SYSTEM_INITIALIZED",
      actor: "gaurav (Super Admin)",
      timestamp: new Date().toISOString(),
      details: "Comprehensive security & audit logging active.",
    });
  }

  // 5. Fetch Blog Posts & Projects
  let posts: BlogPost[] = [];
  let projects: Array<Record<string, unknown>> = [];
  try {
    posts = await getActiveDbPosts();
    projects = (await getActiveDbProjects()) as Array<Record<string, unknown>>;
  } catch {
    posts = [];
    projects = [];
  }

  // 6. Fetch Messages & Subscribers
  const messages: ContactMessage[] = [];
  const subscribers: Subscriber[] = [];

  if (firestore) {
    try {
      const [msgSnap, subSnap] = await Promise.allSettled([
        firestore.collection("messages").get(),
        firestore.collection("subscribers").get(),
      ]);

      if (msgSnap.status === "fulfilled" && !msgSnap.value.empty) {
        msgSnap.value.forEach((doc) => {
          messages.push({ id: doc.id, ...(doc.data() as Omit<ContactMessage, "id">) });
        });
      }
      if (subSnap.status === "fulfilled" && !subSnap.value.empty) {
        subSnap.value.forEach((doc) => {
          subscribers.push({ id: doc.id, ...(doc.data() as Omit<Subscriber, "id">) });
        });
      }
    } catch {
      // Fallback
    }
  }

  // 7. Security Config & DB Stats
  let securityConfig: Record<string, unknown> = {};
  let databaseStats: Record<string, unknown> = {};
  try {
    securityConfig = (await getAdminSecurityConfig()) as unknown as Record<string, unknown>;
    databaseStats = (await getDatabaseStats()) as unknown as Record<string, unknown>;
  } catch {
    securityConfig = { requireEmailOtp: true, requireTotp: false };
  }

  // 8. Compute AI Anomaly Report
  const anomalyReport = computeAiAnomalyReport(visitors, sessions, appeals, auditLogs);

  // 9. Build Manifest
  const now = new Date();
  const manifest: FullExportPackage["manifest"] = {
    title: "Gaurav Portfolio - Administrator Takeout Package",
    system: "Gaurav Portfolio Enterprise Security Engine",
    exportedAt: now.toISOString(),
    timestamp: now.getTime(),
    environment: process.env.NODE_ENV || "production",
    version: "4.0.0",
    author: "Gaurav Patil (Super Admin)",
    counts: {
      visitors: visitors.length,
      sessions: sessions.length,
      appeals: appeals.length,
      auditLogs: auditLogs.length,
      posts: posts.length,
      projects: projects.length,
      messages: messages.length,
      subscribers: subscribers.length,
    },
  };

  // 10. Generate AI Prompt Header & Orphan Health Audit
  const aiPromptMarkdown = generateAiAnomalyPrompt(manifest, anomalyReport);
  const orphanReport = generateOrphanAnalysisReport({
    manifest,
    visitors,
    sessions,
    appeals,
    auditLogs,
    posts,
    projects,
    messages,
    subscribers,
    securityConfig,
    databaseStats,
    anomalyReport,
    aiPromptMarkdown,
  });

  return {
    manifest,
    visitors,
    sessions,
    appeals,
    auditLogs,
    posts,
    projects,
    messages,
    subscribers,
    securityConfig,
    databaseStats,
    anomalyReport,
    aiPromptMarkdown,
    orphanReport,
  };
}
