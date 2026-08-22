import JSZip from "jszip";
import {
  FullExportPackage,
  convertPostsToCsv,
  convertProjectsToCsv,
  convertAuditLogsToCsv,
  convertMessagesToCsv,
  convertSubscribersToCsv,
  generateStandaloneHtmlReport,
  generateWordDocumentReport,
  generatePowerPointPresentation,
  generateOrphanAnalysisReport,
} from "./export-types";

export interface ZipPackagingOptions {
  includeDatabase?: boolean;
  includeSecurity?: boolean;
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
 * Constructs an enterprise-grade multi-format ZIP archive package.
 * Emits fine-grained progress updates with async yields for smooth UI rendering.
 */
export async function packageEnterpriseZip(
  dataset: FullExportPackage,
  options: ZipPackagingOptions = {
    includeDatabase: true,
    includeSecurity: true,
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
  onProgress?.(15, "Stage 1/4: Structuring export manifest & scanning database health...", 1);
  await sleep(70);
  root.file("manifest.json", JSON.stringify(dataset.manifest, null, 2));

  const orphanReport = dataset.orphanReport || generateOrphanAnalysisReport(dataset);
  root.file("orphaned_data_audit.json", JSON.stringify(orphanReport, null, 2));
  root.file("README_AI_ANALYSIS.md", dataset.aiPromptMarkdown);
  totalFiles += 3;

  // Stage 2: Multi-Format Documents (Interactive HTML, Word DOC, PowerPoint PPT)
  onProgress?.(35, "Stage 2/4: Compiling HTML Viewer, Word Document & PowerPoint slides...", 2);
  await sleep(70);

  if (options.includeHtmlReport !== false) {
    const htmlContent = generateStandaloneHtmlReport(dataset);
    root.file("index.html", htmlContent);
    totalFiles += 1;
  }

  if (options.includeWordReport !== false) {
    const wordBlob = generateWordDocumentReport(dataset);
    const wordBuffer = await wordBlob.arrayBuffer();
    root.file("executive_report.doc", wordBuffer);
    totalFiles += 1;
  }

  if (options.includePowerPointReport !== false) {
    const pptHtml = generatePowerPointPresentation(dataset);
    root.file("executive_presentation.ppt.html", pptHtml);
    totalFiles += 1;
  }

  // Stage 3: Content Collections & Audit Logs (JSON + Excel CSV with UTF-8 BOM)
  if (options.includeDatabase !== false) {
    onProgress?.(65, "Stage 3/4: Exporting Content Collections & Audit Logs...", 3);
    await sleep(70);
    const dbFolder = root.folder("database");
    if (dbFolder) {
      dbFolder.file("posts.json", JSON.stringify(dataset.posts, null, 2));
      dbFolder.file("posts.csv", convertPostsToCsv(dataset.posts));
      dbFolder.file("projects.json", JSON.stringify(dataset.projects, null, 2));
      dbFolder.file("projects.csv", convertProjectsToCsv(dataset.projects));
      dbFolder.file("contact_messages.json", JSON.stringify(dataset.messages, null, 2));
      dbFolder.file("contact_messages.csv", convertMessagesToCsv(dataset.messages));
      dbFolder.file("subscribers.json", JSON.stringify(dataset.subscribers, null, 2));
      dbFolder.file("subscribers.csv", convertSubscribersToCsv(dataset.subscribers));
      dbFolder.file("database_stats.json", JSON.stringify(dataset.databaseStats, null, 2));
      totalFiles += 9;
    }
  }

  if (options.includeSecurity !== false) {
    const secFolder = root.folder("security");
    if (secFolder) {
      secFolder.file("security_config.json", JSON.stringify(dataset.securityConfig, null, 2));
      if (dataset.auditLogs && dataset.auditLogs.length > 0) {
        secFolder.file("admin_audit_logs.json", JSON.stringify(dataset.auditLogs, null, 2));
        secFolder.file("admin_audit_logs.csv", convertAuditLogsToCsv(dataset.auditLogs));
        totalFiles += 2;
      }
      totalFiles += 1;
    }
  }

  // Stage 4: Multi-Directory DEFLATE Compression
  onProgress?.(85, "Stage 4/4: Compressing multi-format package into ZIP archive...", 4);
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
      const scaledPercent = 85 + Math.round((meta.percent / 100) * 14);
      onProgress?.(
        Math.min(99, scaledPercent),
        `Compressing ZIP archive (${Math.round(meta.percent)}%)...`,
        4
      );
    }
  );

  const filename = `gaurav_portfolio_admin_export_${dateStr}.zip`;
  onProgress?.(100, "Multi-format package ready!", 4);

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
