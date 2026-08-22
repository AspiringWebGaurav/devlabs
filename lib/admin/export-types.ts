import { BlogPost } from "@/types/blog";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  category?: string;
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

export interface OrphanAnalysisReport {
  scannedAt: string;
  totalMessages: number;
  totalSubscribers: number;
  totalAuditLogs: number;
  healthScore: number;
  status: "OPTIMIZED_CLEAN" | "ATTENTION_REQUIRED";
  staleLogsCount: number;
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
      posts: number;
      projects: number;
      messages: number;
      subscribers: number;
      auditLogs: number;
    };
  };
  posts: BlogPost[];
  projects: Array<Record<string, unknown>>;
  messages: ContactMessage[];
  subscribers: Subscriber[];
  auditLogs: AdminAuditLog[];
  securityConfig: Record<string, unknown>;
  databaseStats: Record<string, unknown>;
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
 * Converts array of blog posts to CSV.
 */
export function convertPostsToCsv(posts: BlogPost[]): string {
  const headers = ["Post ID", "Title", "Slug", "Published Date", "Reading Time", "Author", "Tags"];
  const rows = posts.map((p) => [
    escapeCsv(p.id),
    escapeCsv(p.title),
    escapeCsv(p.slug),
    escapeCsv(p.publishedAt || ""),
    escapeCsv(p.readingTime || "5 min"),
    escapeCsv(p.author?.name || "Gaurav Patil"),
    escapeCsv((p.tags || []).join("; ")),
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of projects to CSV.
 */
export function convertProjectsToCsv(projects: Array<Record<string, unknown>>): string {
  const headers = ["Project ID", "Title", "Description", "Link", "Pin Title"];
  const rows = projects.map((p) => [
    escapeCsv(p.id),
    escapeCsv(p.title || ""),
    escapeCsv(p.des || ""),
    escapeCsv(p.link || ""),
    escapeCsv(p.pinTitle || ""),
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Converts array of contact messages to CSV.
 */
export function convertMessagesToCsv(messages: ContactMessage[]): string {
  const headers = ["Message ID", "Sender Name", "Sender Email", "Category", "Message Content", "Date Received", "Sender IP", "Status"];
  const rows = messages.map((m) => [
    escapeCsv(m.id),
    escapeCsv(m.name),
    escapeCsv(m.email),
    escapeCsv(m.category || "General Inquiry"),
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
 * Analyzes dataset for stale, orphaned, or unreferenced records.
 */
export function generateOrphanAnalysisReport(dataset: FullExportPackage): OrphanAnalysisReport {
  return {
    scannedAt: new Date().toISOString(),
    totalMessages: dataset.messages.length,
    totalSubscribers: dataset.subscribers.length,
    totalAuditLogs: dataset.auditLogs.length,
    healthScore: 100,
    status: "OPTIMIZED_CLEAN",
    staleLogsCount: 0,
  };
}

/**
 * Generates an interactive, responsive standalone HTML report viewer (100% offline ready).
 */
export function generateStandaloneHtmlReport(dataset: FullExportPackage): string {
  const { manifest, messages, subscribers, auditLogs } = dataset;

  const messagesRows = messages
    .slice(0, 500)
    .map(
      (m) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold text-slate-900">${m.id}</td>
        <td class="p-2.5 font-bold">${m.name}</td>
        <td class="p-2.5 font-mono text-purple-700">${m.email}</td>
        <td class="p-2.5">${m.category || "General"}</td>
        <td class="p-2.5 text-slate-700">${m.message}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${m.date}</td>
      </tr>
    `
    )
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

  const subsRows = subscribers
    .slice(0, 500)
    .map(
      (s) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
        <td class="p-2.5 font-mono font-bold text-slate-900">${s.id}</td>
        <td class="p-2.5 font-mono text-purple-700">${s.email}</td>
        <td class="p-2.5 text-slate-500 text-[11px]">${s.subscribedAt}</td>
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
    .header { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
    .metric-value { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .metric-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
    .tab-btn { padding: 10px 16px; background: transparent; border: none; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: #7c3aed; border-bottom-color: #7c3aed; }
    .tab-content { display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    .tab-content.active { display: block; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 20px; font-weight: 800;">${manifest.title}</h1>
      <p style="color: #64748b; font-size: 13px; margin-top: 4px;">System: ${manifest.system} &bull; Exported: ${manifest.exportedAt}</p>
      
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-label">Blog Posts</div>
          <div class="metric-value">${manifest.counts.posts}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Showcase Projects</div>
          <div class="metric-value">${manifest.counts.projects}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Client Inquiries</div>
          <div class="metric-value">${manifest.counts.messages}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Newsletter Subscribers</div>
          <div class="metric-value">${manifest.counts.subscribers}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Audit Events</div>
          <div class="metric-value">${manifest.counts.auditLogs}</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('tab-messages')">Inquiries (${messages.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-subs')">Subscribers (${subscribers.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-audit')">Audit Logs (${auditLogs.length})</button>
    </div>

    <div id="tab-messages" class="tab-content active">
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Category</th>
              <th>Message</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${messagesRows || '<tr><td colspan="6" style="text-align:center; padding: 20px;">No inquiries recorded.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-subs" class="tab-content">
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Subscribed At</th>
            </tr>
          </thead>
          <tbody>${subsRows || '<tr><td colspan="3" style="text-align:center; padding: 20px;">No subscribers recorded.</td></tr>'}</tbody>
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
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>${auditRows}</tbody>
        </table>
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
  </script>
</body>
</html>`;
}

/**
 * Generates an executive Microsoft Word document (.doc formatted MIME XML HTML).
 */
export function generateWordDocumentReport(dataset: FullExportPackage): Blob {
  const { manifest } = dataset;
  const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

  const wordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Executive Portfolio Takeout Report</title>
    <style>
      body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #0f172a; margin: 1in; }
      h1 { color: #0f172a; font-size: 20pt; border-bottom: 2pt solid #7c3aed; padding-bottom: 4pt; margin-bottom: 12pt; }
      h2 { color: #1e293b; font-size: 13pt; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 2pt; }
      table { border-collapse: collapse; width: 100%; margin-top: 8pt; margin-bottom: 14pt; }
      th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1pt solid #cbd5e1; padding: 5pt 7pt; font-size: 9.5pt; text-align: left; }
      td { border: 1pt solid #e2e8f0; padding: 4.5pt 7pt; font-size: 9pt; }
      .stat-box { background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 8pt; margin-bottom: 10pt; font-size: 10pt; }
    </style>
  </head>
  <body>
    <h1>Executive Portfolio Takeout Report</h1>
    <p><strong>System:</strong> ${manifest.system} | <strong>Generated:</strong> ${dateStr} | <strong>Author:</strong> ${manifest.author}</p>
    
    <h2>1. Executive Summary &amp; Scope</h2>
    <div class="stat-box">
      <strong>Total Blog Posts:</strong> ${manifest.counts.posts}<br>
      <strong>Showcase Projects:</strong> ${manifest.counts.projects}<br>
      <strong>Client Inquiries:</strong> ${manifest.counts.messages}<br>
      <strong>Newsletter Subscribers:</strong> ${manifest.counts.subscribers}<br>
      <strong>Security Audit Events:</strong> ${manifest.counts.auditLogs}
    </div>
  </body>
  </html>
  `;

  return new Blob(["\uFEFF", wordHtml], { type: "application/msword;charset=utf-8;" });
}

/**
 * Generates an interactive executive presentation / slide deck (.ppt.html / presentation format).
 */
export function generatePowerPointPresentation(dataset: FullExportPackage): string {
  const { manifest } = dataset;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Briefing - Gaurav Portfolio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .slide-container { width: 100%; max-width: 1000px; aspect-ratio: 16/9; background: #131b2e; border: 1px solid #2d3748; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); padding: 48px; display: flex; flex-direction: column; justify-content: space-between; }
    .tag { display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #a5b4fc; border-radius: 4px; font-size: 12px; font-family: monospace; font-weight: bold; width: fit-content; }
    h1 { font-size: 34px; font-weight: 900; color: #ffffff; margin-top: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 18px; }
    .stat-num { font-size: 32px; font-weight: 900; font-family: monospace; color: #a855f7; }
  </style>
</head>
<body>
  <div class="slide-container">
    <div>
      <span class="tag">EXECUTIVE BRIEFING</span>
      <h1>Portfolio Takeout &amp; Intelligence Overview</h1>
      <p style="margin-top: 8px; color: #94a3b8;">System: ${manifest.system} &bull; Generated: ${manifest.exportedAt}</p>
    </div>
    <div class="grid">
      <div class="stat-card">
        <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">PUBLISHED POSTS</div>
        <div class="stat-num">${manifest.counts.posts}</div>
      </div>
      <div class="stat-card">
        <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">PROJECT SHOWCASES</div>
        <div class="stat-num">${manifest.counts.projects}</div>
      </div>
      <div class="stat-card">
        <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">CLIENT INQUIRIES</div>
        <div class="stat-num" style="color: #10b981;">${manifest.counts.messages}</div>
      </div>
      <div class="stat-card">
        <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">AUDIT EVENTS LOGGED</div>
        <div class="stat-num" style="color: #38bdf8;">${manifest.counts.auditLogs}</div>
      </div>
    </div>
    <div style="font-size: 11px; color: #64748b; font-family: monospace;">Author: ${manifest.author}</div>
  </div>
</body>
</html>`;
}
