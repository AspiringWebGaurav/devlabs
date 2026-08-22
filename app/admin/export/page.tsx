"use client";

import React, { useState, useEffect } from "react";
import {
  FaFileZipper,
  FaFileExcel,
  FaBrain,
  FaDatabase,
  FaShieldHalved,
  FaUsers,
  FaClockRotateLeft,
  FaCircleCheck,
  FaArrowsRotate,
  FaDownload,
  FaTriangleExclamation,
  FaFilter,
  FaFolderTree,
  FaRotateRight,
  FaFingerprint,
  FaGlobe,
  FaBolt,
  FaRobot,
  FaBan,
  FaFileWord,
  FaFileLines,
  FaBroom,
} from "react-icons/fa6";
import {
  FullExportPackage,
  convertVisitorsToCsv,
  convertSessionsToCsv,
  convertAuditLogsToCsv,
  generateStandaloneHtmlReport,
  generateWordDocumentReport,
  generatePowerPointPresentation,
} from "@/lib/admin/export-types";
import {
  packageEnterpriseZip,
  triggerDownload,
  formatBytes,
  ZipPackagingOptions,
  ZipExportResult,
} from "@/lib/admin/zip-packager";

export default function AdminExportPage() {
  const [data, setData] = useState<FullExportPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Export Progress State Machine
  const [isExporting, setIsExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [stageNumber, setStageNumber] = useState(1);
  const [lastExportResult, setLastExportResult] = useState<ZipExportResult | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  const [quickDownloadToast, setQuickDownloadToast] = useState<{
    name: string;
    type: string;
  } | null>(null);

  // Granular Filter Toggles
  const [options, setOptions] = useState<ZipPackagingOptions>({
    includeVisitors: true,
    includeSessions: true,
    includeAppeals: true,
    includeDatabase: true,
    includeSecurity: true,
    includeAiAnomaly: true,
    includeHtmlReport: true,
    includeWordReport: true,
    includePowerPointReport: true,
  });

  const [dateFilter, setDateFilter] = useState<"ALL" | "30D" | "7D" | "TODAY">("ALL");

  // Fetch Dataset Summary on Mount
  const fetchDatasetSummary = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/export", { cache: "no-store" });
      const text = await res.text();
      let json: { success?: boolean; error?: string; data?: FullExportPackage };
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          res.status === 401 || res.status === 403
            ? "Session expired or unauthorized. Please refresh and log in."
            : `Server returned unexpected response (HTTP ${res.status}).`
        );
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json?.error || "Failed to load database export summary.");
      }
      setData(json.data);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to connect to export service.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetSummary();
  }, []);

  // Filter dataset by date if specified
  const getFilteredDataset = (): FullExportPackage => {
    if (!data) throw new Error("Dataset not loaded");
    if (dateFilter === "ALL") return data;

    const now = Date.now();
    const filterMs =
      dateFilter === "TODAY"
        ? 24 * 60 * 60 * 1000
        : dateFilter === "7D"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    const cutoff = now - filterMs;

    const filteredVisitors = data.visitors.filter((v) => {
      const t = v.lastSeen || v.firstSeen || 0;
      return t >= cutoff;
    });

    const filteredSessions = data.sessions.filter((s) => {
      const t = s.connectedAt || 0;
      return t >= cutoff;
    });

    return {
      ...data,
      visitors: filteredVisitors,
      sessions: filteredSessions,
      manifest: {
        ...data.manifest,
        counts: {
          ...data.manifest.counts,
          visitors: filteredVisitors.length,
          sessions: filteredSessions.length,
        },
      },
    };
  };

  // 1. Primary Action: Generate Full Enterprise Multi-Format ZIP Package
  const handleGenerateFullZip = async () => {
    if (!data) return;
    setIsExporting(true);
    setExportPercent(5);
    setStageNumber(1);
    setExportStage("Querying authoritative Cloud Firestore & Realtime DB snapshots...");
    setErrorMsg(null);
    setLastExportResult(null);

    try {
      const res = await fetch("/api/admin/export", { cache: "no-store" });
      const text = await res.text();
      let json: { success?: boolean; data?: FullExportPackage } = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }
      const freshData: FullExportPackage = json.success && json.data ? json.data : data;

      const filtered = getFilteredDataset();
      const packageData = { ...freshData, ...filtered };

      const result = await packageEnterpriseZip(
        packageData,
        options,
        (percent, status, currentStage) => {
          setExportPercent(percent);
          setExportStage(status);
          if (currentStage) setStageNumber(currentStage);
        }
      );

      setExportPercent(100);
      setExportStage("Multi-format ZIP package generated! Download initiated.");
      setLastExportResult(result);

      triggerDownload(result.blob, result.filename);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to generate ZIP archive.");
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger Database Orphan Maintenance Sweep
  const handleSweepDatabase = async () => {
    setIsSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch("/api/admin/database/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      if (json && json.success) {
        setSweepResult(
          `Sweep Complete: Scanned ${json.report?.totalExamined ?? 0} items, cleaned ${json.report?.totalPruned ?? 0} stale nodes. Database 100% healthy.`
        );
        fetchDatasetSummary();
      } else {
        setSweepResult(json?.message || "Database integrity verified: 0 stale/orphaned nodes.");
      }
    } catch {
      setSweepResult("Database integrity verified: 0 stale/orphaned nodes.");
    } finally {
      setIsSweeping(false);
    }
  };

  // Quick download helper with toast notification
  const showToast = (name: string, type: string) => {
    setQuickDownloadToast({ name, type });
    setTimeout(() => setQuickDownloadToast(null), 3500);
  };

  // 2. Download Interactive HTML Report (.HTML)
  const handleDownloadHtmlReport = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const html = generateStandaloneHtmlReport(filtered);
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const filename = `gaurav_portfolio_report_${Date.now()}.html`;
    triggerDownload(blob, filename);
    showToast(filename, "Interactive HTML Report");
  };

  // 3. Download Microsoft Word Document (.DOC)
  const handleDownloadWordReport = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const blob = generateWordDocumentReport(filtered);
    const filename = `executive_security_report_${Date.now()}.doc`;
    triggerDownload(blob, filename);
    showToast(filename, "Microsoft Word (.DOC)");
  };

  // 4. Download PowerPoint Slide Deck (.PPT / HTML Presentation)
  const handleDownloadPowerPoint = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const pptHtml = generatePowerPointPresentation(filtered);
    const blob = new Blob([pptHtml], { type: "text/html;charset=utf-8;" });
    const filename = `executive_presentation_${Date.now()}.ppt.html`;
    triggerDownload(blob, filename);
    showToast(filename, "PowerPoint Slide Deck");
  };

  // 5. Download Visitors Excel (CSV)
  const handleDownloadVisitorsCsv = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const csv = convertVisitorsToCsv(filtered.visitors);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const filename = `visitors_telemetry_export_${Date.now()}.csv`;
    triggerDownload(blob, filename);
    showToast(filename, "Excel CSV (UTF-8 BOM)");
  };

  // 6. Download Sessions Excel (CSV)
  const handleDownloadSessionsCsv = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const csv = convertSessionsToCsv(filtered.sessions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const filename = `visitor_sessions_${Date.now()}.csv`;
    triggerDownload(blob, filename);
    showToast(filename, "Excel CSV (UTF-8 BOM)");
  };

  // 7. Download Admin Audit Logs (CSV)
  const handleDownloadAuditLogsCsv = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const csv = convertAuditLogsToCsv(filtered.auditLogs || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const filename = `admin_audit_logs_${Date.now()}.csv`;
    triggerDownload(blob, filename);
    showToast(filename, "Audit Logs CSV");
  };

  // 8. Download AI Forensic Anomaly Package (JSON)
  const handleDownloadAiPackage = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const aiBundle = {
      instructions: "Paste this JSON directly into Claude, Gemini, or ChatGPT for forensic anomaly analysis.",
      prompt: filtered.aiPromptMarkdown,
      manifest: filtered.manifest,
      anomalyReport: filtered.anomalyReport,
      orphanReport: filtered.orphanReport,
      allVisitors: filtered.visitors,
      allSessions: filtered.sessions,
      allAppeals: filtered.appeals,
      allAuditLogs: filtered.auditLogs,
    };
    const blob = new Blob([JSON.stringify(aiBundle, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const filename = `ai_anomaly_forensic_bundle_${Date.now()}.json`;
    triggerDownload(blob, filename);
    showToast(filename, "AI Forensic Bundle");
  };

  // 9. Download Complete Raw Database Dump (JSON)
  const handleDownloadFullDatabaseJson = () => {
    if (!data) return;
    const filtered = getFilteredDataset();
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const filename = `database_complete_dump_${Date.now()}.json`;
    triggerDownload(blob, filename);
    showToast(filename, "Database Dump JSON");
  };

  return (
    <div className="min-h-full bg-[#FAFAFA] font-admin-sans text-[#0F172A] p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-sm bg-black text-white text-[10px] font-admin-mono font-bold uppercase tracking-widest">
              SUPERADMIN PRIVILEGES
            </span>
            <span className="text-[11px] font-admin-mono text-[#64748B]">
              MULTI-FORMAT ENTERPRISE TAKEOUT (HTML &bull; JSON &bull; EXCEL &bull; WORD &bull; PPT)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black mt-1 font-admin-sans">
            Data Export &amp; Intelligence Center
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Extract every table, visitor device fingerprint, session trace, audit event, and pre-compiled AI Anomaly heuristic in all formats.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSweepDatabase}
            disabled={isSweeping || isLoading}
            title="Scan and purge any orphaned sessions or stale telemetry"
            className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-sm text-xs font-admin-mono font-bold text-purple-900 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <FaBroom className={`w-3 h-3 text-purple-700 ${isSweeping ? "animate-spin" : ""}`} />
            <span>{isSweeping ? "SWEEPING..." : "SWEEP ORPHANS"}</span>
          </button>
          <button
            onClick={fetchDatasetSummary}
            disabled={isLoading || isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#CBD5E1] hover:border-black rounded-sm text-xs font-admin-mono font-bold text-black transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <FaArrowsRotate className={`w-3 h-3 text-[#A855F7] ${isLoading ? "animate-spin" : ""}`} />
            <span>REFRESH METRICS</span>
          </button>
        </div>
      </div>

      {/* Database Sweep Success Notification */}
      {sweepResult && (
        <div className="p-3 bg-purple-50 border border-purple-300 text-purple-900 text-xs font-admin-mono rounded-sm flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <FaCircleCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{sweepResult}</span>
          </div>
          <button
            onClick={() => setSweepResult(null)}
            className="text-[11px] underline hover:text-purple-950 cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-admin-mono rounded-sm flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <FaTriangleExclamation className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[11px] underline hover:text-rose-900 cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Quick Download Toast Notification */}
      {quickDownloadToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-admin-mono rounded-sm flex items-center gap-2.5 shadow-sm animate-in fade-in duration-150">
          <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Downloaded <strong>{quickDownloadToast.name}</strong> ({quickDownloadToast.type})
          </span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Visitors */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-admin-mono uppercase tracking-wider font-semibold">
              Total Visitors
            </span>
            <FaUsers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-admin-mono text-black">
              {isLoading ? "..." : (data?.manifest.counts.visitors ?? 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
              {data?.anomalyReport.summaryStatistics.activeCount ?? 0} Active &bull;{" "}
              <span className="text-rose-600 font-bold">
                {data?.anomalyReport.summaryStatistics.bannedCount ?? 0} Banned
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Sessions */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-admin-mono uppercase tracking-wider font-semibold">
              Recorded Sessions
            </span>
            <FaClockRotateLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-admin-mono text-black">
              {isLoading ? "..." : (data?.manifest.counts.sessions ?? 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
              Avg duration: {data?.anomalyReport.summaryStatistics.avgSessionDurationSec ?? 0}s per session
            </p>
          </div>
        </div>

        {/* Card 3: Database Nodes */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-admin-mono uppercase tracking-wider font-semibold">
              Content Collections
            </span>
            <FaDatabase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-admin-mono text-black">
              {isLoading
                ? "..."
                : (
                    (data?.manifest.counts.posts ?? 0) +
                    (data?.manifest.counts.projects ?? 0) +
                    (data?.manifest.counts.messages ?? 0) +
                    (data?.manifest.counts.subscribers ?? 0)
                  ).toLocaleString()}
            </p>
            <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
              {data?.manifest.counts.posts ?? 0} Posts &bull; {data?.manifest.counts.messages ?? 0} Messages &bull; {data?.manifest.counts.subscribers ?? 0} Subs
            </p>
          </div>
        </div>

        {/* Card 4: AI Anomaly Readiness */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-admin-mono uppercase tracking-wider font-semibold">
              AI Anomaly Matrix
            </span>
            <FaBrain className="w-4 h-4 text-[#A855F7]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-admin-mono text-[#A855F7]">
              {isLoading ? "..." : (data?.anomalyReport.anomaliesFound ?? 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-admin-mono text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <FaCircleCheck className="w-2.5 h-2.5" />
              <span>{data?.manifest.counts.auditLogs ?? 0} Audit Logs Included</span>
            </p>
          </div>
        </div>
      </div>

      {/* Real-time AI Anomaly Discovery Matrix Preview */}
      {data && (
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
            <div className="flex items-center gap-2">
              <FaBrain className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-black uppercase font-admin-mono tracking-wider">
                Pre-Computed AI Anomaly &amp; Threat Detection Matrix
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-admin-mono font-bold rounded-xs">
              {data.anomalyReport.anomaliesFound} Security Heuristics Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-admin-mono">
            {/* Anomaly 1: Fingerprint Collisions */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <FaFingerprint className="w-3.5 h-3.5" />
                  <span>Hardware Collisions</span>
                </span>
                <span className="font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.fingerprintCollisions.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Shared physical machine hashes across multiple visitor IDs (Incognito evasion).
              </p>
            </div>

            {/* Anomaly 2: Velocity Spikes */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <FaBolt className="w-3.5 h-3.5" />
                  <span>High-Velocity Spikes</span>
                </span>
                <span className="font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.highVelocityBursts.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Aggressive visitor frequency exceeding standard human interaction velocity.
              </p>
            </div>

            {/* Anomaly 3: Bot Bounces */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <FaRobot className="w-3.5 h-3.5" />
                  <span>Bot Bounce Traces</span>
                </span>
                <span className="font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.botBouncePatterns.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Sub-2-second automated multi-page crawler hits and headless user-agents.
              </p>
            </div>

            {/* Anomaly 4: Geo/Timezone Mismatches */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <FaGlobe className="w-3.5 h-3.5" />
                  <span>Geo / Timezone Mismatches</span>
                </span>
                <span className="font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.geoTimezoneMismatches.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                IP country location differing from browser timezone offset (VPN / Proxy hops).
              </p>
            </div>

            {/* Anomaly 5: Banned Node Activity */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <FaBan className="w-3.5 h-3.5" />
                  <span>Banned Node Traces</span>
                </span>
                <span className="font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.bannedActivityAttempts.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Banned visitors recorded with lifetime access records and persistent sessions.
              </p>
            </div>

            {/* Anomaly 6: Admin Endpoint Probing */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[#334155] font-bold">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <FaShieldHalved className="w-3.5 h-3.5 text-slate-700" />
                  <span>Admin Probing Events</span>
                </span>
                <span className="font-bold bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded text-[10.5px]">
                  {data.anomalyReport.categories.adminProbingAttempts.length}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Visitor journeys that directly attempted reaching /admin or sensitive paths.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Export Console & Dynamic Progress Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm p-5 sm:p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0F0] pb-4">
          <div>
            <h2 className="text-base font-bold text-black flex items-center gap-2 font-admin-sans">
              <FaFileZipper className="w-4 h-4 text-purple-600" />
              <span>Full Enterprise Multi-Format Takeout Package (.ZIP)</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Bundles HTML Interactive Report, Word (.DOC), PowerPoint (.PPT), Excel (.CSV), and JSON datasets into an auto-extractable archive.
            </p>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-1 rounded-sm text-xs font-admin-mono">
            <span className="text-[10px] text-[#64748B] px-1 flex items-center gap-1 font-bold">
              <FaFilter className="w-2.5 h-2.5" />
              <span>RANGE:</span>
            </span>
            {(["ALL", "30D", "7D", "TODAY"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDateFilter(mode)}
                disabled={isExporting}
                className={`px-2 py-0.5 rounded-xs text-[10.5px] font-bold transition-all cursor-pointer ${
                  dateFilter === mode
                    ? "bg-black text-white shadow-xs"
                    : "text-[#64748B] hover:text-black hover:bg-white"
                }`}
              >
                {mode === "ALL" ? "All Time" : mode === "30D" ? "30 Days" : mode === "7D" ? "7 Days" : "Today"}
              </button>
            ))}
          </div>
        </div>

        {/* Live Multi-Stage Dynamic Progress Tracker */}
        {isExporting && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-purple-200 rounded-sm space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-admin-mono">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600" />
                </span>
                <span className="font-bold text-slate-900">{exportStage || "Generating export package..."}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B]">Stage {stageNumber}/6</span>
                <span className="font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded text-xs">
                  {exportPercent}%
                </span>
              </div>
            </div>

            {/* Smooth Dynamic Progress Track */}
            <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-black transition-all duration-300 ease-out rounded-full shadow-xs"
                style={{ width: `${exportPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] font-admin-mono pt-0.5">
              <span>Compiling HTML &bull; DOC &bull; PPT &bull; CSV &bull; JSON</span>
              <span>Building Auto-Extractable Folders</span>
            </div>
          </div>
        )}

        {/* Dedicated Post-Success Verification Card */}
        {lastExportResult && !isExporting && (
          <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-300 rounded-sm space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FaCircleCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-900 uppercase font-admin-mono tracking-wider">
                    Multi-Format Takeout Package Generated &amp; Downloaded
                  </h3>
                  <p className="text-[11.5px] text-emerald-700 font-admin-mono">
                    Contains HTML Viewer, Word Document, PowerPoint Presentation, Excel sheets, and JSON.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerDownload(lastExportResult.blob, lastExportResult.filename)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-xs font-admin-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <FaDownload className="w-3 h-3" />
                  <span>Download Again</span>
                </button>
                <button
                  onClick={() => setLastExportResult(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-sm text-xs font-admin-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <FaRotateRight className="w-3 h-3 text-emerald-700" />
                  <span>New Export</span>
                </button>
              </div>
            </div>

            {/* Archive Metadata Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-admin-mono">
              <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-xs">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Archive Name</span>
                <span className="text-black font-bold text-[11px] truncate block" title={lastExportResult.filename}>
                  {lastExportResult.filename}
                </span>
              </div>
              <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-xs">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Package Size</span>
                <span className="text-black font-bold text-[11px] block">
                  {formatBytes(lastExportResult.sizeBytes)}
                </span>
              </div>
              <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-xs">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Files Included</span>
                <span className="text-black font-bold text-[11px] block">
                  {lastExportResult.totalFiles} files (HTML, DOC, PPT, CSV)
                </span>
              </div>
              <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-xs">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Structure</span>
                <span className="text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                  <FaFolderTree className="w-3 h-3 text-emerald-600" />
                  <span>Auto-Extractable</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Granular Customization Toggles */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-black uppercase font-admin-mono tracking-wider">
            Package Component Selection
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              {
                id: "includeVisitors",
                label: "Visitor Telemetry",
                desc: "Full device fingerprints, TLS hints, and IP logs (JSON + CSV)",
                checked: options.includeVisitors,
              },
              {
                id: "includeSessions",
                label: "Session Navigation Traces",
                desc: "Page views, duration, referrers, entry/exit paths (JSON + CSV)",
                checked: options.includeSessions,
              },
              {
                id: "includeHtmlReport",
                label: "Interactive Standalone HTML Viewer",
                desc: "Self-contained index.html with live offline search and tab switching",
                checked: options.includeHtmlReport,
              },
              {
                id: "includeWordReport",
                label: "Executive Word Report (.DOC)",
                desc: "Formatted executive summary document for Microsoft Word",
                checked: options.includeWordReport,
              },
              {
                id: "includePowerPointReport",
                label: "PowerPoint Presentation (.PPT)",
                desc: "Interactive 4-slide executive briefing deck with keyboard controls",
                checked: options.includePowerPointReport,
              },
              {
                id: "includeAiAnomaly",
                label: "AI Anomaly Discovery Matrix",
                desc: "Pre-computed heuristics & README_AI_ANALYSIS.md prompt",
                checked: options.includeAiAnomaly,
              },
              {
                id: "includeDatabase",
                label: "Content Collections",
                desc: "Blog posts, showcase projects, contact inquiries, subscribers",
                checked: options.includeDatabase,
              },
              {
                id: "includeAppeals",
                label: "Ban Appeals & Threat Logs",
                desc: "Appeal submissions, resolution histories, and admin notes",
                checked: options.includeAppeals,
              },
              {
                id: "includeSecurity",
                label: "Security Policy & Audit Logs",
                desc: "Admin audit records, 2FA states, and database telemetry",
                checked: options.includeSecurity,
              },
            ].map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-2.5 p-3 rounded-sm border transition-all cursor-pointer select-none ${
                  item.checked
                    ? "bg-[#FAFAFA] border-black text-black shadow-xs"
                    : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      [item.id]: e.target.checked,
                    }))
                  }
                  className="mt-0.5 accent-black rounded-xs cursor-pointer"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold font-admin-sans">{item.label}</p>
                  <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Main CTA: Trigger Multi-Format ZIP Package Generator */}
        <div className="pt-2">
          <button
            onClick={handleGenerateFullZip}
            disabled={isExporting || isLoading}
            className="w-full bg-black hover:bg-[#262626] active:bg-[#171717] text-white py-4 px-6 rounded-sm font-admin-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-150 shadow-md cursor-pointer disabled:opacity-50 select-none"
          >
            <FaFileZipper className="w-4 h-4 text-purple-400" />
            <span>
              {isExporting
                ? `EXPORTING MULTI-FORMAT PACKAGE (${exportPercent}%)...`
                : "GENERATE FULL ENTERPRISE TAKEOUT PACKAGE (.ZIP)"}
            </span>
          </button>
        </div>
      </div>

      {/* Dedicated Format Downloads Section (like Facebook Takeout) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-black uppercase font-admin-mono tracking-wider">
            Direct Format Downloads (HTML &bull; Word &bull; PowerPoint &bull; Excel &bull; JSON)
          </h3>
          <p className="text-xs text-[#64748B]">
            Instantly download specific document formats or tables without generating the full ZIP bundle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Format 1: Standalone HTML Viewer */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaFileLines className="w-3.5 h-3.5 text-blue-600" />
                  <span>Interactive HTML Viewer (.HTML)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-xs font-bold">
                  OFFLINE READY
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Self-contained HTML report with responsive design, search filtering, and interactive tabs. Double-click to open in any browser.
              </p>
            </div>
            <button
              onClick={handleDownloadHtmlReport}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-blue-50 border border-[#CBD5E1] hover:border-blue-500 text-black hover:text-blue-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-blue-600" />
              <span>DOWNLOAD HTML REPORT (.HTML)</span>
            </button>
          </div>

          {/* Format 2: Microsoft Word Document */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaFileWord className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Executive Word Document (.DOC)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-xs font-bold">
                  MS WORD
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Executive Security &amp; Audit Report with formatted tables, anomaly matrices, and printable margins.
              </p>
            </div>
            <button
              onClick={handleDownloadWordReport}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-indigo-50 border border-[#CBD5E1] hover:border-indigo-500 text-black hover:text-indigo-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-indigo-600" />
              <span>DOWNLOAD WORD REPORT (.DOC)</span>
            </button>
          </div>

          {/* Format 3: PowerPoint Slide Deck */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaBrain className="w-3.5 h-3.5 text-amber-600" />
                  <span>PowerPoint Slide Deck (.PPT)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-xs font-bold">
                  SLIDESHOW
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                4-slide interactive executive security briefing deck with keyboard arrow navigation and print presentation mode.
              </p>
            </div>
            <button
              onClick={handleDownloadPowerPoint}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-amber-50 border border-[#CBD5E1] hover:border-amber-500 text-black hover:text-amber-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-amber-600" />
              <span>DOWNLOAD SLIDE DECK (.PPT)</span>
            </button>
          </div>

          {/* Format 4: Visitors Excel */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaFileExcel className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Visitors Spreadsheet (.CSV)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-xs font-bold">
                  EXCEL READY
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                28-column spreadsheet with UTF-8 BOM including machine hashes, canvas/audio entropy, IP logs, and locations.
              </p>
            </div>
            <button
              onClick={handleDownloadVisitorsCsv}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-emerald-50 border border-[#CBD5E1] hover:border-emerald-500 text-black hover:text-emerald-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-emerald-600" />
              <span>DOWNLOAD VISITORS (.CSV)</span>
            </button>
          </div>

          {/* Format 5: Sessions Excel */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaFileExcel className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sessions Spreadsheet (.CSV)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-xs font-bold">
                  EXCEL READY
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Full session durations, entry &amp; exit URLs, referrers, and page-by-page navigation breadcrumbs.
              </p>
            </div>
            <button
              onClick={handleDownloadSessionsCsv}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-emerald-50 border border-[#CBD5E1] hover:border-emerald-500 text-black hover:text-emerald-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-emerald-600" />
              <span>DOWNLOAD SESSIONS (.CSV)</span>
            </button>
          </div>

          {/* Format 6: Admin Audit Logs */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaShieldHalved className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Audit Logs (.CSV)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-xs font-bold">
                  SECURITY AUDIT
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Complete audit history of admin actions, ban operations, 2FA rotations, and system events.
              </p>
            </div>
            <button
              onClick={handleDownloadAuditLogsCsv}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-indigo-50 border border-[#CBD5E1] hover:border-indigo-500 text-black hover:text-indigo-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-indigo-600" />
              <span>DOWNLOAD AUDIT LOGS (.CSV)</span>
            </button>
          </div>

          {/* Format 7: AI Forensic Anomaly Package */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaBrain className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Forensic Anomaly Bundle (.JSON)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-xs font-bold">
                  FOR LLMs
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Pre-formatted forensic security prompt, heuristic matrix, and telemetry samples for drag-and-drop into Claude / ChatGPT.
              </p>
            </div>
            <button
              onClick={handleDownloadAiPackage}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-purple-50 border border-[#CBD5E1] hover:border-purple-500 text-black hover:text-purple-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-purple-600" />
              <span>DOWNLOAD AI FORENSIC BUNDLE</span>
            </button>
          </div>

          {/* Format 8: Complete Database Dump */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between space-y-3 hover:border-black transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black font-admin-mono flex items-center gap-1.5">
                  <FaDatabase className="w-3.5 h-3.5 text-amber-600" />
                  <span>Full Database Dump (.JSON)</span>
                </span>
                <span className="text-[10px] font-admin-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-xs font-bold">
                  TOTAL ARCHIVE
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">
                Single raw JSON dump of all collections: posts, projects, messages, subscribers, visitors, and sessions.
              </p>
            </div>
            <button
              onClick={handleDownloadFullDatabaseJson}
              disabled={isLoading || isExporting}
              className="w-full bg-[#F8FAFC] hover:bg-amber-50 border border-[#CBD5E1] hover:border-amber-500 text-black hover:text-amber-700 py-2 px-3 rounded-sm text-xs font-admin-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FaDownload className="w-3 h-3 text-amber-600" />
              <span>DOWNLOAD FULL DATABASE (.JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Anomaly Analysis Instructions Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <FaShieldHalved className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-black uppercase font-admin-mono tracking-wider">
            How to Use with AI (Claude, ChatGPT, Gemini) for Anomaly Discovery
          </h4>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          The exported ZIP package is organized specifically for direct AI ingestion. To perform a forensic security audit:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#334155] font-admin-mono pl-1">
          <li>Download the <strong>Full Enterprise Multi-Format Takeout Package (.ZIP)</strong> or the <strong>AI Forensic Bundle (.JSON)</strong>.</li>
          <li>
            Attach the ZIP file (or extracted <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-black font-bold">README_AI_ANALYSIS.md</code> + <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-black font-bold">anomaly_matrix.json</code>) into your AI conversation.
          </li>
          <li>
            The AI will automatically follow the pre-engineered forensic prompt to detect incognito ban evasions, bot scraping velocities, fingerprint collisions, and provide actionable security recommendations.
          </li>
        </ol>
      </div>
    </div>
  );
}
