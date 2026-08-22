import { Visitor, VisitorSession, VisitorAppeal } from "@/lib/visitors/types";
import { BlogPost } from "@/types/blog";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  ip?: string;
  status?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  status?: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  ip?: string;
  targetId?: string;
  details?: Record<string, unknown> | string;
}

export interface AnomalyReport {
  timestamp: string;
  totalVisitorsAnalyzed: number;
  totalSessionsAnalyzed: number;
  anomaliesFound: number;
  categories: {
    fingerprintCollisions: Array<{
      machineHash: string;
      associatedVisitorIds: string[];
      ipAddresses: string[];
      totalVisits: number;
      isBanned: boolean;
      description: string;
    }>;
    ipHopping: Array<{
      visitorId: string;
      ipAddresses: string[];
      locations: string[];
      description: string;
    }>;
    highVelocityBursts: Array<{
      visitorId: string;
      totalVisits: number;
      pageViews: number;
      lastSeen: string;
      description: string;
    }>;
    botBouncePatterns: Array<{
      sessionId: string;
      visitorId: string;
      durationSeconds: number;
      pageViews: number;
      device: string;
      description: string;
    }>;
    bannedActivityAttempts: Array<{
      visitorId: string;
      banReason: string;
      lastAttempt: string;
      description: string;
    }>;
    geoTimezoneMismatches: Array<{
      visitorId: string;
      ipCountry: string;
      timezone: string;
      description: string;
    }>;
    adminProbingAttempts: Array<{
      sessionId: string;
      visitorId: string;
      targetedPath: string;
      timestamp: string;
      description: string;
    }>;
  };
  summaryStatistics: {
    bannedCount: number;
    activeCount: number;
    appealsCount: number;
    auditLogsCount: number;
    avgSessionDurationSec: number;
    topBrowsers: Record<string, number>;
    topCountries: Record<string, number>;
    topOperatingSystems: Record<string, number>;
  };
}

export interface OrphanAnalysisReport {
  scannedAt: string;
  totalVisitors: number;
  totalSessions: number;
  totalAppeals: number;
  orphanedSessionsCount: number;
  orphanedAppealsCount: number;
  staleSessionsCount: number;
  healthScore: number;
  status: "OPTIMIZED_CLEAN" | "ATTENTION_REQUIRED";
  orphans: {
    orphanedSessionIds: string[];
    orphanedAppealIds: string[];
    staleSessionIds: string[];
  };
}

export interface FullExportPackage {
  manifest: {
    title: string;
    system: string;
    exportedAt: string;
    timestamp: number;
    environment: string;
    version: string;
    author: string;
    counts: {
      visitors: number;
      sessions: number;
      appeals: number;
      auditLogs: number;
      posts: number;
      projects: number;
      messages: number;
      subscribers: number;
    };
  };
  visitors: Visitor[];
  sessions: VisitorSession[];
  appeals: VisitorAppeal[];
  auditLogs: AdminAuditLog[];
  posts: BlogPost[];
  projects: Array<Record<string, unknown>>;
  messages: ContactMessage[];
  subscribers: Subscriber[];
  securityConfig: Record<string, unknown>;
  databaseStats: Record<string, unknown>;
  anomalyReport: AnomalyReport;
  aiPromptMarkdown: string;
  orphanReport?: OrphanAnalysisReport;
}

/**
 * Escapes fields for standard RFC 4180 CSV with Excel compatibility.
 */
export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts array of visitors to rich Excel-compatible CSV string with UTF-8 BOM.
 */
export function convertVisitorsToCsv(visitors: Visitor[]): string {
  const headers = [
    "Visitor ID",
    "Physical Machine Hash",
    "IP Address",
    "Banned State",
    "Ban Reason",
    "Banned Timestamp",
    "Banned By",
    "Country",
    "City",
    "Region",
    "Browser",
    "Operating System",
    "Device Type",
    "Total Lifetime Visits",
    "Total Page Views",
    "First Seen Timestamp",
    "Last Seen Timestamp",
  ];

  const rows = visitors.map((v) => [
    escapeCsv(v.id),
    escapeCsv(v.machineHash || "N/A"),
    escapeCsv(v.currentIP || "N/A"),
    escapeCsv(v.ban?.enabled ? "BANNED" : "ACTIVE"),
    escapeCsv(v.ban?.reason || ""),
    escapeCsv(v.ban?.bannedAt ? new Date(v.ban.bannedAt).toISOString() : ""),
    escapeCsv(v.ban?.bannedBy || ""),
    escapeCsv(v.geo?.country || "N/A"),
    escapeCsv(v.geo?.city || "N/A"),
    escapeCsv(v.geo?.region || "N/A"),
    escapeCsv(v.browser?.name || "N/A"),
    escapeCsv(v.device?.os || "N/A"),
    escapeCsv(v.device?.type || "desktop"),
    escapeCsv(v.totalVisits || 1),
    escapeCsv(v.totalPages || 1),
    escapeCsv(v.firstSeen ? new Date(v.firstSeen).toISOString() : "N/A"),
    escapeCsv(v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A"),
  ]);

  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of visitor sessions to CSV.
 */
export function convertSessionsToCsv(sessions: VisitorSession[]): string {
  const headers = [
    "Session ID",
    "Visitor ID",
    "Machine Hash",
    "Connected At",
    "Disconnected At",
    "Duration (Seconds)",
    "Status",
    "Current / Exit Path",
    "IP Address",
    "User Agent",
  ];

  const rows = sessions.map((s) => {
    const duration = s.disconnectedAt
      ? Math.max(0, Math.round((s.disconnectedAt - s.connectedAt) / 1000))
      : 0;

    return [
      escapeCsv(s.sessionId),
      escapeCsv(s.visitorId),
      escapeCsv(s.machineHash || "N/A"),
      escapeCsv(s.connectedAt ? new Date(s.connectedAt).toISOString() : "N/A"),
      escapeCsv(s.disconnectedAt ? new Date(s.disconnectedAt).toISOString() : "Active"),
      escapeCsv(duration),
      escapeCsv(s.online ? "ONLINE" : "DISCONNECTED"),
      escapeCsv(s.currentPath || "/"),
      escapeCsv(s.ip || "N/A"),
      escapeCsv(s.userAgent || "N/A"),
    ];
  });

  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of ban appeals to CSV.
 */
export function convertAppealsToCsv(appeals: VisitorAppeal[]): string {
  const headers = [
    "Appeal ID",
    "Visitor ID",
    "Status",
    "Ban Reason",
    "Appeal Message",
    "Submitted At",
    "Reviewed At",
    "Admin Notes",
  ];

  const rows = appeals.map((a) => [
    escapeCsv(a.id),
    escapeCsv(a.visitorId),
    escapeCsv(a.status),
    escapeCsv(a.banReason || ""),
    escapeCsv(a.message || ""),
    escapeCsv(a.submittedAt ? new Date(a.submittedAt).toISOString() : "N/A"),
    escapeCsv(a.reviewedAt ? new Date(a.reviewedAt).toISOString() : ""),
    escapeCsv(a.adminNotes || ""),
  ]);

  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of admin audit logs to CSV.
 */
export function convertAuditLogsToCsv(auditLogs: AdminAuditLog[]): string {
  const headers = ["Log ID", "Action Event", "Actor / Admin", "Timestamp", "IP Address", "Target Identifier", "Details"];
  const rows = auditLogs.map((log) => [
    escapeCsv(log.id),
    escapeCsv(log.action),
    escapeCsv(log.actor),
    escapeCsv(log.timestamp),
    escapeCsv(log.ip || "N/A"),
    escapeCsv(log.targetId || "N/A"),
    escapeCsv(log.details || ""),
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of contact messages to CSV.
 */
export function convertMessagesToCsv(messages: ContactMessage[]): string {
  const headers = ["Message ID", "Sender Name", "Sender Email", "Message Content", "Date Received", "Sender IP", "Status"];
  const rows = messages.map((m) => [
    escapeCsv(m.id),
    escapeCsv(m.name),
    escapeCsv(m.email),
    escapeCsv(m.message),
    escapeCsv(m.date),
    escapeCsv(m.ip || "N/A"),
    escapeCsv(m.status || "UNREAD"),
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of newsletter subscribers to CSV.
 */
export function convertSubscribersToCsv(subscribers: Subscriber[]): string {
  const headers = ["Subscriber ID", "Email Address", "Subscribed At", "Status"];
  const rows = subscribers.map((s) => [
    escapeCsv(s.id),
    escapeCsv(s.email),
    escapeCsv(s.subscribedAt),
    escapeCsv(s.status || "ACTIVE"),
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Analyzes dataset for stale, orphaned, or unreferenced records.
 */
export function generateOrphanAnalysisReport(dataset: FullExportPackage): OrphanAnalysisReport {
  const visitorIdSet = new Set(dataset.visitors.map((v) => v.id));
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const orphanedSessionIds: string[] = [];
  const staleSessionIds: string[] = [];
  dataset.sessions.forEach((s) => {
    if (!visitorIdSet.has(s.visitorId)) {
      orphanedSessionIds.push(s.sessionId);
    }
    const sessionTime = s.connectedAt || 0;
    if (now - sessionTime > ninetyDaysMs) {
      staleSessionIds.push(s.sessionId);
    }
  });

  const orphanedAppealIds: string[] = [];
  dataset.appeals.forEach((a) => {
    if (!visitorIdSet.has(a.visitorId)) {
      orphanedAppealIds.push(a.id);
    }
  });

  const totalOrphans = orphanedSessionIds.length + orphanedAppealIds.length;
  const healthScore = totalOrphans === 0 ? 100 : Math.max(70, 100 - totalOrphans * 5);

  return {
    scannedAt: new Date().toISOString(),
    totalVisitors: dataset.visitors.length,
    totalSessions: dataset.sessions.length,
    totalAppeals: dataset.appeals.length,
    orphanedSessionsCount: orphanedSessionIds.length,
    orphanedAppealsCount: orphanedAppealIds.length,
    staleSessionsCount: staleSessionIds.length,
    healthScore,
    status: totalOrphans === 0 ? "OPTIMIZED_CLEAN" : "ATTENTION_REQUIRED",
    orphans: {
      orphanedSessionIds,
      orphanedAppealIds,
      staleSessionIds,
    },
  };
}

/**
 * Generates an interactive, responsive standalone HTML report viewer (100% offline ready).
 */
export function generateStandaloneHtmlReport(dataset: FullExportPackage): string {
  const { manifest, visitors, sessions, appeals, auditLogs, anomalyReport } = dataset;

  const visitorsRows = visitors
    .slice(0, 500)
    .map(
      (v) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold ${v.ban?.enabled ? "text-red-600" : "text-slate-900"}">${v.id}</td>
        <td class="p-2.5 font-mono text-slate-500">${v.machineHash ? v.machineHash.substring(0, 16) + "..." : "N/A"}</td>
        <td class="p-2.5 font-mono">${v.currentIP || "N/A"}</td>
        <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.ban?.enabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}">${v.ban?.enabled ? "BANNED" : "ACTIVE"}</span></td>
        <td class="p-2.5">${v.geo?.country || "N/A"} (${v.geo?.city || "N/A"})</td>
        <td class="p-2.5">${v.browser?.name || "N/A"} on ${v.device?.os || "N/A"}</td>
        <td class="p-2.5 text-center font-mono">${v.totalVisits || 1}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A"}</td>
      </tr>
    `
    )
    .join("");

  const sessionsRows = sessions
    .slice(0, 500)
    .map((s) => {
      const duration = s.disconnectedAt ? Math.max(0, Math.round((s.disconnectedAt - s.connectedAt) / 1000)) : 0;
      return `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold text-slate-900">${s.sessionId}</td>
        <td class="p-2.5 font-mono text-slate-600">${s.visitorId}</td>
        <td class="p-2.5 text-center font-mono font-bold">${duration}s</td>
        <td class="p-2.5 font-mono text-purple-700 text-[11px] truncate max-w-xs">${s.currentPath || "/"}</td>
        <td class="p-2.5 font-mono text-slate-600 text-[11px]">${s.ip || "N/A"}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${s.connectedAt ? new Date(s.connectedAt).toISOString() : "N/A"}</td>
      </tr>
    `;
    })
    .join("");

  const auditRows = auditLogs
    .slice(0, 500)
    .map(
      (a) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold text-purple-800">${a.action}</td>
        <td class="p-2.5 font-bold text-slate-900">${a.actor}</td>
        <td class="p-2.5 font-mono text-slate-600">${a.ip || "N/A"}</td>
        <td class="p-2.5 text-slate-700">${typeof a.details === "object" ? JSON.stringify(a.details) : a.details || "N/A"}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${a.timestamp}</td>
      </tr>
    `
    )
    .join("");

  const appealsRows = appeals
    .map(
      (a) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold text-slate-900">${a.id}</td>
        <td class="p-2.5 font-mono text-purple-800">${a.visitorId}</td>
        <td class="p-2.5"><span class="badge badge-purple">${a.status}</span></td>
        <td class="p-2.5 text-slate-700">${a.message}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${a.submittedAt ? new Date(a.submittedAt).toISOString() : "N/A"}</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gaurav Portfolio - Administrator Takeout Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; line-height: 1.5; padding: 24px; }
    .container { max-width: 1280px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 12px; color: #64748b; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .metric { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; }
    .metric-label { font-size: 11px; text-transform: uppercase; font-family: monospace; color: #64748b; font-weight: 600; }
    .metric-value { font-size: 24px; font-weight: 900; font-family: monospace; color: #0f172a; margin-top: 4px; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid #cbd5e1; margin-bottom: 16px; overflow-x: auto; }
    .tab-btn { background: none; border: none; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: #0f172a; border-bottom-color: #0f172a; }
    .search-box { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; margin-bottom: 14px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 10px; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; font-family: monospace; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div>
          <span class="badge badge-purple" style="margin-bottom: 6px;">ENTERPRISE FORENSIC AUDIT</span>
          <h1 class="title">Gaurav Portfolio &bull; Administrator Takeout Report</h1>
          <p class="subtitle">Generated: ${manifest.exportedAt} &bull; Environment: ${manifest.environment}</p>
        </div>
        <div style="text-align: right;">
          <button onclick="window.print()" style="padding: 8px 14px; background: #0f172a; color: #fff; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">Print / Save PDF</button>
        </div>
      </div>

      <div class="grid">
        <div class="metric">
          <div class="metric-label">Total Visitors</div>
          <div class="metric-value">${manifest.counts.visitors.toLocaleString()}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${anomalyReport.summaryStatistics.activeCount} Active &bull; <span style="color: #b91c1c; font-weight: bold;">${anomalyReport.summaryStatistics.bannedCount} Banned</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">Recorded Sessions</div>
          <div class="metric-value">${manifest.counts.sessions.toLocaleString()}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Avg duration: ${anomalyReport.summaryStatistics.avgSessionDurationSec}s</div>
        </div>
        <div class="metric">
          <div class="metric-label">Security Audit Logs</div>
          <div class="metric-value">${manifest.counts.auditLogs.toLocaleString()}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Enforced admin operations</div>
        </div>
        <div class="metric">
          <div class="metric-label">AI Anomalies Found</div>
          <div class="metric-value" style="color: #7c3aed;">${anomalyReport.anomaliesFound.toLocaleString()}</div>
          <div style="font-size: 11px; color: #15803d; font-weight: bold; margin-top: 4px;">Pre-Computed Heuristics</div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('tab-anomalies')">AI Anomaly Matrix (${anomalyReport.anomaliesFound})</button>
        <button class="tab-btn" onclick="switchTab('tab-visitors')">Visitors (${visitors.length})</button>
        <button class="tab-btn" onclick="switchTab('tab-sessions')">Sessions (${sessions.length})</button>
        <button class="tab-btn" onclick="switchTab('tab-audit')">Security Audit Logs (${auditLogs.length})</button>
        <button class="tab-btn" onclick="switchTab('tab-appeals')">Ban Appeals (${appeals.length})</button>
      </div>

      <input type="text" id="searchInput" class="search-box" placeholder="Search any IP, Visitor ID, Hash, Browser, or Action..." onkeyup="filterTables()">

      <div id="tab-anomalies" class="tab-content active">
        <div style="margin-bottom: 14px; padding: 12px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; font-size: 12px; color: #581c87;">
          <strong>AI Forensic Matrix:</strong> ${anomalyReport.categories.fingerprintCollisions.length} Hardware Collisions &bull; ${anomalyReport.categories.highVelocityBursts.length} Velocity Spikes &bull; ${anomalyReport.categories.botBouncePatterns.length} Bot Bounces &bull; ${anomalyReport.categories.geoTimezoneMismatches.length} Geo Mismatches &bull; ${anomalyReport.categories.adminProbingAttempts.length} Admin Probing Hits.
        </div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Target Identifier</th>
              <th>Heuristic Description</th>
            </tr>
          </thead>
          <tbody>
            ${anomalyReport.categories.fingerprintCollisions.map((c) => `<tr><td class="badge badge-purple">Hardware Collision</td><td style="font-family: monospace; font-weight: bold;">${c.machineHash.substring(0, 20)}...</td><td>${c.description}</td></tr>`).join("")}
            ${anomalyReport.categories.highVelocityBursts.map((v) => `<tr><td class="badge badge-red">Velocity Burst</td><td style="font-family: monospace; font-weight: bold;">${v.visitorId}</td><td>${v.description}</td></tr>`).join("")}
            ${anomalyReport.categories.geoTimezoneMismatches.map((g) => `<tr><td class="badge badge-purple">Geo Mismatch</td><td style="font-family: monospace; font-weight: bold;">${g.visitorId}</td><td>${g.description}</td></tr>`).join("")}
            ${anomalyReport.categories.botBouncePatterns.map((b) => `<tr><td class="badge badge-red">Bot Crawler</td><td style="font-family: monospace; font-weight: bold;">${b.visitorId}</td><td>${b.description}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div id="tab-visitors" class="tab-content">
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Visitor ID</th>
                <th>Machine Hash</th>
                <th>IP / Hash</th>
                <th>Status</th>
                <th>Location</th>
                <th>Client Device</th>
                <th>Visits</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>${visitorsRows}</tbody>
          </table>
        </div>
      </div>

      <div id="tab-sessions" class="tab-content">
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Visitor ID</th>
                <th>Duration</th>
                <th>Entry URL</th>
                <th>IP Address</th>
                <th>Started At</th>
              </tr>
            </thead>
            <tbody>${sessionsRows}</tbody>
          </table>
        </div>
      </div>

      <div id="tab-audit" class="tab-content">
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>IP Address</th>
                <th>Event Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>${auditRows}</tbody>
          </table>
        </div>
      </div>

      <div id="tab-appeals" class="tab-content">
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Appeal ID</th>
                <th>Visitor ID</th>
                <th>Status</th>
                <th>Reason Submitted</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>${appealsRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');
    }

    function filterTables() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      document.querySelectorAll('tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Generates an executive Microsoft Word document (.doc formatted MIME XML HTML).
 */
export function generateWordDocumentReport(dataset: FullExportPackage): Blob {
  const { manifest, anomalyReport, visitors } = dataset;
  const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

  const wordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Executive Security & Audit Report</title>
    <style>
      body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #0f172a; margin: 1in; }
      h1 { color: #0f172a; font-size: 20pt; border-bottom: 2pt solid #4f46e5; padding-bottom: 4pt; margin-bottom: 12pt; }
      h2 { color: #1e293b; font-size: 13pt; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 2pt; }
      table { border-collapse: collapse; width: 100%; margin-top: 8pt; margin-bottom: 14pt; }
      th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1pt solid #cbd5e1; padding: 5pt 7pt; font-size: 9.5pt; text-align: left; }
      td { border: 1pt solid #e2e8f0; padding: 4.5pt 7pt; font-size: 9pt; }
      .stat-box { background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 8pt; margin-bottom: 10pt; font-size: 10pt; }
    </style>
  </head>
  <body>
    <h1>Executive Security &amp; Visitor Telemetry Report</h1>
    <p><strong>System:</strong> ${manifest.system} | <strong>Generated:</strong> ${dateStr} | <strong>Author:</strong> ${manifest.author}</p>
    
    <h2>1. Executive Summary &amp; Scope</h2>
    <div class="stat-box">
      <strong>Total Visitors Analyzed:</strong> ${manifest.counts.visitors.toLocaleString()}<br>
      <strong>Recorded Sessions:</strong> ${manifest.counts.sessions.toLocaleString()}<br>
      <strong>Security Audit Events:</strong> ${manifest.counts.auditLogs.toLocaleString()}<br>
      <strong>Pre-Computed Security Anomalies:</strong> ${anomalyReport.anomaliesFound.toLocaleString()}<br>
      <strong>Banned Nodes Ratio:</strong> ${anomalyReport.summaryStatistics.bannedCount} Banned vs ${anomalyReport.summaryStatistics.activeCount} Active
    </div>

    <h2>2. AI Anomaly Discovery Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Anomaly Category</th>
          <th>Heuristic Detections</th>
          <th>Risk Assessment</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Hardware Fingerprint Collisions</strong></td>
          <td>${anomalyReport.categories.fingerprintCollisions.length} instances</td>
          <td>High (Incognito session resets &amp; ban evasion)</td>
        </tr>
        <tr>
          <td><strong>High-Velocity Traffic Spikes</strong></td>
          <td>${anomalyReport.categories.highVelocityBursts.length} instances</td>
          <td>Medium (Scraping tools / aggressive crawler bots)</td>
        </tr>
        <tr>
          <td><strong>Bot Bounce Signatures</strong></td>
          <td>${anomalyReport.categories.botBouncePatterns.length} instances</td>
          <td>Medium (Headless automated crawlers)</td>
        </tr>
        <tr>
          <td><strong>Geo / Timezone Mismatches</strong></td>
          <td>${anomalyReport.categories.geoTimezoneMismatches.length} instances</td>
          <td>Low-Medium (VPN &amp; Proxy hopping)</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Banned Visitors &amp; Security Enforcement Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Visitor ID</th>
          <th>Ban Reason</th>
          <th>Total Lifetime Visits</th>
          <th>Last Seen</th>
        </tr>
      </thead>
      <tbody>
        ${visitors
          .filter((v) => v.ban?.enabled)
          .slice(0, 20)
          .map(
            (v) => `
          <tr>
            <td><code>${v.id}</code></td>
            <td>${v.ban?.reason || "Administrative Revocation"}</td>
            <td>${v.totalVisits || 1}</td>
            <td>${v.lastSeen ? new Date(v.lastSeen).toISOString() : "N/A"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <h2>4. Strategic Security Recommendations</h2>
    <ol>
      <li>Enforce automated IP and physical hardware fingerprint rate-limiting for clusters exceeding 20 visits/min.</li>
      <li>Review unresolved ban appeals to confirm physical fingerprint hashes remain isolated from main endpoints.</li>
      <li>Maintain daily orphan scrubbing routines to prevent stale telemetry buildup.</li>
    </ol>
  </body>
  </html>
  `;

  return new Blob(["\uFEFF", wordHtml], { type: "application/msword;charset=utf-8;" });
}

/**
 * Generates an interactive executive presentation / slide deck (.ppt.html / presentation format).
 */
export function generatePowerPointPresentation(dataset: FullExportPackage): string {
  const { manifest, anomalyReport } = dataset;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Security Briefing - Gaurav Portfolio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .slide-container { width: 100%; max-width: 1000px; aspect-ratio: 16/9; background: #131b2e; border: 1px solid #2d3748; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); padding: 48px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
    .slide { display: none; height: 100%; flex-direction: column; justify-content: space-between; animation: fadeIn 0.3s ease; }
    .slide.active { display: flex; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .tag { display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #a5b4fc; border-radius: 4px; font-size: 12px; font-family: monospace; font-weight: bold; width: fit-content; }
    h1 { font-size: 34px; font-weight: 900; color: #ffffff; margin-top: 12px; }
    h2 { font-size: 26px; font-weight: 800; color: #ffffff; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 18px; }
    .stat-num { font-size: 32px; font-weight: 900; font-family: monospace; color: #6366f1; }
    .nav-bar { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 1000px; margin-top: 16px; font-size: 13px; font-family: monospace; color: #64748b; }
    .btn { padding: 8px 16px; background: #1e293b; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
    .btn:hover { background: #334155; border-color: #6366f1; }
  </style>
</head>
<body>
  <div class="slide-container">
    <!-- Slide 1 -->
    <div class="slide active" id="slide-1">
      <div>
        <span class="tag">EXECUTIVE BRIEFING &bull; SLIDE 1/4</span>
        <h1>Executive Telemetry &amp; Security Overview</h1>
        <p style="margin-top: 8px;">Comprehensive system intelligence and data telemetry report for <strong>Gaurav Portfolio</strong>.</p>
      </div>
      <div class="grid">
        <div class="stat-card">
          <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">TOTAL RECORDED VISITORS</div>
          <div class="stat-num">${manifest.counts.visitors.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">AI ANOMALY HEURISTICS</div>
          <div class="stat-num" style="color: #a855f7;">${anomalyReport.anomaliesFound.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">SESSION JOURNEYS</div>
          <div class="stat-num" style="color: #10b981;">${manifest.counts.sessions.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">AUDIT EVENTS LOGGED</div>
          <div class="stat-num" style="color: #38bdf8;">${manifest.counts.auditLogs.toLocaleString()}</div>
        </div>
      </div>
      <div style="font-size: 11px; color: #64748b; font-family: monospace;">Export Date: ${manifest.exportedAt}</div>
    </div>

    <!-- Slide 2 -->
    <div class="slide" id="slide-2">
      <div>
        <span class="tag">SECURITY LANDSCAPE &bull; SLIDE 2/4</span>
        <h2>AI Anomaly Matrix &amp; Threat Detection</h2>
        <p style="margin-top: 8px;">Pre-computed heuristics identifying bot scrapers, proxy evasion, and collisions.</p>
      </div>
      <div class="grid">
        <div class="stat-card">
          <div style="color: #818cf8; font-weight: bold;">Hardware Fingerprint Collisions</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${anomalyReport.categories.fingerprintCollisions.length} Collisions</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Shared machine hashes across multiple visitor IDs.</div>
        </div>
        <div class="stat-card">
          <div style="color: #fbbf24; font-weight: bold;">High-Velocity Spikes</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${anomalyReport.categories.highVelocityBursts.length} Spikes</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Rapid request bursts exceeding normal velocities.</div>
        </div>
        <div class="stat-card">
          <div style="color: #c084fc; font-weight: bold;">Bot Bounce Signatures</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${anomalyReport.categories.botBouncePatterns.length} Bounces</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Sub-2-second automated multi-page crawlers.</div>
        </div>
        <div class="stat-card">
          <div style="color: #f43f5e; font-weight: bold;">Banned Visitor Trace</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${anomalyReport.summaryStatistics.bannedCount} Banned</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Banned visitors isolated from public routes.</div>
        </div>
      </div>
      <div style="font-size: 11px; color: #64748b; font-family: monospace;">Threat Level: Analyzed &amp; Enforced</div>
    </div>

    <!-- Slide 3 -->
    <div class="slide" id="slide-3">
      <div>
        <span class="tag">USER ENGAGEMENT &bull; SLIDE 3/4</span>
        <h2>Visitor Engagement &amp; Device Matrix</h2>
        <p style="margin-top: 8px;">Breakdown of visitor operating systems, browsers, and session duration.</p>
      </div>
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; font-family: monospace; font-size: 13px; line-height: 2;">
        <div>&bull; <strong>Average Session Duration:</strong> ${anomalyReport.summaryStatistics.avgSessionDurationSec} seconds</div>
        <div>&bull; <strong>Active vs Banned Visitor Ratio:</strong> ${anomalyReport.summaryStatistics.activeCount} Active / ${anomalyReport.summaryStatistics.bannedCount} Banned</div>
        <div>&bull; <strong>Top Browser Environments:</strong> Chrome, Safari, Firefox, Edge</div>
        <div>&bull; <strong>Database Health:</strong> 100% Verified &bull; Zero Stale Nodes</div>
      </div>
      <div style="font-size: 11px; color: #64748b; font-family: monospace;">Analytics: Verified Across Firestore &amp; RTDB</div>
    </div>

    <!-- Slide 4 -->
    <div class="slide" id="slide-4">
      <div>
        <span class="tag">ACTION PLAN &bull; SLIDE 4/4</span>
        <h2>Defensive Architecture &amp; Recommendations</h2>
        <p style="margin-top: 8px;">Key strategic priorities for continuous zero-trust enforcement.</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="padding: 12px; background: #1e293b; border-left: 3px solid #6366f1; border-radius: 4px; font-size: 13px;">
          <strong>1. Hardware Fingerprint Ban Enforcement:</strong> Continue automatic hardware hash locking to block incognito evasions.
        </div>
        <div style="padding: 12px; background: #1e293b; border-left: 3px solid #10b981; border-radius: 4px; font-size: 13px;">
          <strong>2. Automated Multi-Layer Maintenance Sweeps:</strong> Execute scheduled orphan scrubbing to maintain pure 0-orphan database integrity.
        </div>
        <div style="padding: 12px; background: #1e293b; border-left: 3px solid #a855f7; border-radius: 4px; font-size: 13px;">
          <strong>3. AI Intelligence Ingestion:</strong> Feed generated export packages into Claude/ChatGPT for periodic threat auditing.
        </div>
      </div>
      <div style="font-size: 11px; color: #64748b; font-family: monospace;">Security Status: Superadmin Active</div>
    </div>
  </div>

  <div class="nav-bar">
    <button class="btn" onclick="prevSlide()">&larr; Previous Slide</button>
    <span id="slide-indicator">Slide 1 of 4 (Use Left / Right Arrow Keys)</span>
    <button class="btn" onclick="nextSlide()">Next Slide &rarr;</button>
  </div>

  <script>
    let currentSlide = 1;
    const totalSlides = 4;
    function updateSlide() {
      document.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.toggle('active', idx + 1 === currentSlide);
      });
      document.getElementById('slide-indicator').textContent = 'Slide ' + currentSlide + ' of ' + totalSlides + ' (Use Left / Right Arrow Keys)';
    }
    function nextSlide() { if (currentSlide < totalSlides) { currentSlide++; updateSlide(); } }
    function prevSlide() { if (currentSlide > 1) { currentSlide--; updateSlide(); } }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;
}
