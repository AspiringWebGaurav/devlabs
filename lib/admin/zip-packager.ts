import JSZip from "jszip";
import {
  FullExportPackage,
  convertVisitorsToCsv,
  convertSessionsToCsv,
  convertAppealsToCsv,
  convertAuditLogsToCsv,
  convertMessagesToCsv,
  convertSubscribersToCsv,
  generateStandaloneHtmlReport,
  generateWordDocumentReport,
  generatePowerPointPresentation,
  generateOrphanAnalysisReport,
} from "./export-types";

export interface ZipPackagingOptions {
  includeVisitors?: boolean;
  includeSessions?: boolean;
  includeAppeals?: boolean;
  includeDatabase?: boolean;
  includeSecurity?: boolean;
  includeAiAnomaly?: boolean;
  includeHtmlReport?: boolean;
  includeWordReport?: boolean;
  includePowerPointReport?: boolean;
}

export interface ZipExportResult {
  blob: Blob;
  filename: string;
  sizeBytes: number;
  totalFiles: number;
  timestamp: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Constructs an enterprise-grade multi-format ZIP archive package mirroring Meta / Google Takeout.
 * Emits fine-grained progress updates with async yields for smooth UI rendering.
 */
export async function packageEnterpriseZip(
  dataset: FullExportPackage,
  options: ZipPackagingOptions = {
    includeVisitors: true,
    includeSessions: true,
    includeAppeals: true,
    includeDatabase: true,
    includeSecurity: true,
    includeAiAnomaly: true,
    includeHtmlReport: true,
    includeWordReport: true,
    includePowerPointReport: true,
  },
  onProgress?: (percent: number, status: string, stageNum?: number) => void
): Promise<ZipExportResult> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const folderName = `gaurav_portfolio_export_${dateStr}`;
  const root = zip.folder(folderName) || zip;
  let totalFiles = 0;

  // Stage 1: Manifest, Schemas & Orphan Data Audit
  onProgress?.(10, "Stage 1/6: Structuring export manifest & scanning database health...", 1);
  await sleep(70);
  root.file("manifest.json", JSON.stringify(dataset.manifest, null, 2));

  const orphanReport = dataset.orphanReport || generateOrphanAnalysisReport(dataset);
  root.file("orphaned_data_audit.json", JSON.stringify(orphanReport, null, 2));
  totalFiles += 2;

  // Stage 2: Multi-Format Documents (Interactive HTML, Word DOC, PowerPoint PPT)
  onProgress?.(22, "Stage 2/6: Compiling HTML Viewer, Word Document & PowerPoint slides...", 2);
  await sleep(70);

  if (options.includeHtmlReport !== false) {
    const htmlContent = generateStandaloneHtmlReport(dataset);
    root.file("index.html", htmlContent);
    totalFiles += 1;
  }

  if (options.includeWordReport !== false) {
    const wordBlob = generateWordDocumentReport(dataset);
    const wordBuffer = await wordBlob.arrayBuffer();
    root.file("executive_security_report.doc", wordBuffer);
    totalFiles += 1;
  }

  if (options.includePowerPointReport !== false) {
    const pptHtml = generatePowerPointPresentation(dataset);
    root.file("executive_presentation.ppt.html", pptHtml);
    totalFiles += 1;
  }

  // Stage 3: AI Anomaly Forensic Prompt & Matrix
  if (options.includeAiAnomaly !== false) {
    onProgress?.(38, "Stage 3/6: Synthesizing AI Forensic Prompt & Anomaly Matrix...", 3);
    await sleep(70);
    root.file("README_AI_ANALYSIS.md", dataset.aiPromptMarkdown);
    root.file("anomaly_matrix.json", JSON.stringify(dataset.anomalyReport, null, 2));
    totalFiles += 2;
  }

  // Stage 4: Visitors & Sessions Telemetry (JSON + Excel CSV with UTF-8 BOM)
  if (options.includeVisitors !== false) {
    onProgress?.(52, "Stage 4/6: Formatting Visitor telemetry (JSON + Excel CSV)...", 4);
    await sleep(70);
    const visitorsFolder = root.folder("visitors");
    if (visitorsFolder) {
      visitorsFolder.file("visitors.json", JSON.stringify(dataset.visitors, null, 2));
      visitorsFolder.file("visitors.csv", convertVisitorsToCsv(dataset.visitors));
      totalFiles += 2;
    }
  }

  if (options.includeSessions !== false) {
    const sessionsFolder = root.folder("sessions");
    if (sessionsFolder) {
      sessionsFolder.file("visitor_sessions.json", JSON.stringify(dataset.sessions, null, 2));
      sessionsFolder.file("visitor_sessions.csv", convertSessionsToCsv(dataset.sessions));
      totalFiles += 2;
    }
  }

  // Stage 5: Appeals & Content Collections & Security Audit Logs
  if (options.includeAppeals !== false && dataset.appeals.length > 0) {
    const appealsFolder = root.folder("appeals");
    if (appealsFolder) {
      appealsFolder.file("ban_appeals.json", JSON.stringify(dataset.appeals, null, 2));
      appealsFolder.file("ban_appeals.csv", convertAppealsToCsv(dataset.appeals));
      totalFiles += 2;
    }
  }

  if (options.includeDatabase !== false) {
    onProgress?.(68, "Stage 5/6: Exporting Content Collections & Audit Logs...", 5);
    await sleep(70);
    const dbFolder = root.folder("database");
    if (dbFolder) {
      dbFolder.file("posts.json", JSON.stringify(dataset.posts, null, 2));
      dbFolder.file("projects.json", JSON.stringify(dataset.projects, null, 2));
      dbFolder.file("contact_messages.json", JSON.stringify(dataset.messages, null, 2));
      dbFolder.file("contact_messages.csv", convertMessagesToCsv(dataset.messages));
      dbFolder.file("subscribers.json", JSON.stringify(dataset.subscribers, null, 2));
      dbFolder.file("subscribers.csv", convertSubscribersToCsv(dataset.subscribers));
      dbFolder.file("database_stats.json", JSON.stringify(dataset.databaseStats, null, 2));
      totalFiles += 7;
    }
  }

  if (options.includeSecurity !== false) {
    const secFolder = root.folder("security");
    if (secFolder) {
      secFolder.file("security_config.json", JSON.stringify(dataset.securityConfig, null, 2));
      secFolder.file(
        "threat_summary.json",
        JSON.stringify(dataset.anomalyReport.summaryStatistics, null, 2)
      );
      if (dataset.auditLogs && dataset.auditLogs.length > 0) {
        secFolder.file("admin_audit_logs.json", JSON.stringify(dataset.auditLogs, null, 2));
        secFolder.file("admin_audit_logs.csv", convertAuditLogsToCsv(dataset.auditLogs));
        totalFiles += 2;
      }
      totalFiles += 2;
    }
  }

  // Stage 6: Multi-Directory DEFLATE Compression
  onProgress?.(84, "Stage 6/6: Compressing multi-format package into ZIP archive...", 6);
  await sleep(60);

  const content = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    },
    (meta) => {
      const scaledPercent = 84 + Math.round((meta.percent / 100) * 15);
      onProgress?.(
        Math.min(99, scaledPercent),
        `Compressing ZIP archive (${Math.round(meta.percent)}%)...`,
        6
      );
    }
  );

  const filename = `gaurav_portfolio_admin_export_${dateStr}.zip`;
  onProgress?.(100, "Multi-format package ready!", 6);

  return {
    blob: content,
    filename,
    sizeBytes: content.size,
    totalFiles,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats bytes to human-readable size.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Triggers instant browser download of any Blob.
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
