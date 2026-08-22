"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FaUsers,
  FaTowerBroadcast,
  FaCalendarDay,
  FaRepeat,
  FaShieldHalved,
  FaBan,
  FaTrashCan,
  FaCopy,
  FaCheck,
  FaDesktop,
  FaMobileScreen,
  FaTabletScreenButton,
  FaMagnifyingGlass,
  FaArrowRotateRight,
  FaCircleCheck,
  FaTriangleExclamation,
  FaXmark,
  FaChevronLeft,
  FaChevronRight,
  FaEnvelope,
  FaCircleXmark,
  FaPause,
} from "react-icons/fa6";
import { Visitor, VisitorStatsSummary, VisitorAppeal, AppealStatus } from "@/lib/visitors/types";

export default function AdminVisitorsPage() {
  // Navigation sub-tab: "visitors" vs "appeals" (synced with URL & LocalStorage across hard refreshes)
  const [activeTab, setActiveTabState] = useState<"visitors" | "appeals">("visitors");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab === "visitors" || urlTab === "appeals") {
        setActiveTabState(urlTab);
      } else {
        const saved = localStorage.getItem("admin_tab_visitors");
        if (saved === "visitors" || saved === "appeals") {
          setActiveTabState(saved);
        }
      }
    }
  }, []);

  const setActiveTab = (tab: "visitors" | "appeals") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_tab_visitors", tab);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [appeals, setAppeals] = useState<VisitorAppeal[]>([]);
  const [summary, setSummary] = useState<VisitorStatsSummary>({
    onlineNow: 0,
    totalUnique: 0,
    todayVisitors: 0,
    returningVisitors: 0,
    deviceDistribution: { desktop: 0, mobile: 0, tablet: 0 },
    browserDistribution: {},
    countryDistribution: {},
    dailyVisitors: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "banned">("all");
  const [appealFilter, setAppealFilter] = useState<"all" | AppealStatus>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination State for Visitors
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pagination State for Appeals
  const [appealPage, setAppealPage] = useState(1);
  const [appealPageSize, setAppealPageSize] = useState(10);

  // Ban Modal State
  const [banModalVisitor, setBanModalVisitor] = useState<Visitor | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("Access permanently revoked by administrator");
  const [isBanning, setIsBanning] = useState(false);

  // Delete Modal State
  const [deleteModalVisitor, setDeleteModalVisitor] = useState<Visitor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Appeal Action Loading State
  const [processingAppealId, setProcessingAppealId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // SSE Connection State - Verified Live Reload 8
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Sweep Stale & Orphan Telemetry
  const handleSweepStaleData = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch("/api/admin/database/cleanup", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setNotification({
          type: "success",
          text: data.message || "Stale telemetry swept successfully.",
        });
        fetchVisitors();
        fetchAppeals();
      } else {
        setNotification({
          type: "error",
          text: (data && data.error) || "Failed to prune stale telemetry.",
        });
      }
    } catch {
      setNotification({
        type: "error",
        text: "Network error while pruning stale telemetry.",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  // Fetch Visitors
  const fetchVisitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/visitors/list?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setVisitors(data.visitors || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch visitors:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Fetch Appeals
  const fetchAppeals = useCallback(async () => {
    setIsLoadingAppeals(true);
    try {
      const res = await fetch("/api/admin/visitors/appeals", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (data && data.success && data.appeals) {
        setAppeals(data.appeals);
      }
    } catch (err) {
      console.error("Failed to fetch appeals:", err);
    } finally {
      setIsLoadingAppeals(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
    fetchAppeals();
  }, [fetchVisitors, fetchAppeals]);

  // Establish Admin SSE Real-Time Connection
  useEffect(() => {
    const es = new EventSource("/api/admin/visitors/stream", { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
    };

    es.addEventListener("INITIAL_STATS", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.summary) setSummary(data.summary);
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_CONNECTED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitor) {
          setVisitors((prev) => {
            const exists = prev.some((v) => v.id === data.visitor.id);
            if (exists) {
              return prev.map((v) =>
                v.id === data.visitor.id ? { ...v, ...data.visitor, online: true } : v
              );
            }
            return [data.visitor, ...prev];
          });
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_UPDATED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitor) {
          setVisitors((prev) =>
            prev.map((v) => (v.id === data.visitor.id ? { ...v, ...data.visitor } : v))
          );
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_DISCONNECTED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitorId) {
          setVisitors((prev) =>
            prev.map((v) => (v.id === data.visitorId ? { ...v, online: false } : v))
          );
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_BANNED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitorId) {
          setVisitors((prev) =>
            prev.map((v) =>
              v.id === data.visitorId
                ? {
                    ...v,
                    ban: { enabled: true, reason: data.reason, bannedAt: data.timestamp },
                  }
                : v
            )
          );
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_UNBANNED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitorId) {
          setVisitors((prev) =>
            prev.map((v) =>
              v.id === data.visitorId
                ? {
                    ...v,
                    ban: { enabled: false },
                  }
                : v
            )
          );
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("VISITOR_DELETED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.visitorId) {
          setVisitors((prev) => prev.filter((v) => v.id !== data.visitorId));
        }
      } catch {
        // Ignored
      }
    });

    // Real-Time Appeal Events
    es.addEventListener("APPEAL_CREATED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.appeal) {
          setAppeals((prev) => [data.appeal, ...prev.filter((a) => a.id !== data.appeal.id)]);
          setNotification({
            type: "success",
            text: `New Ban Appeal submitted by ${data.appeal.email} for ${data.appeal.visitorId}`,
          });
        }
      } catch {
        // Ignored
      }
    });

    es.addEventListener("APPEAL_UPDATED", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.appeal) {
          setAppeals((prev) =>
            prev.map((a) => (a.id === data.appeal.id ? { ...a, ...data.appeal } : a))
          );
        }
      } catch {
        // Ignored
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Copy Visitor ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Remote Ban Action
  const executeBan = async () => {
    if (!banModalVisitor) return;
    setIsBanning(true);
    try {
      const res = await fetch("/api/admin/visitors/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: banModalVisitor.id,
          action: "ban",
          reason: banReasonInput,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setNotification({
          type: "success",
          text: `Visitor ${banModalVisitor.id} was banned and locked out in real time.`,
        });
        setVisitors((prev) =>
          prev.map((v) =>
            v.id === banModalVisitor.id
              ? {
                  ...v,
                  ban: { enabled: true, reason: banReasonInput, bannedAt: Date.now() },
                }
              : v
          )
        );
      } else {
        setNotification({ type: "error", text: (data && data.error) || "Failed to execute ban." });
      }
    } catch {
      setNotification({ type: "error", text: "Network error while executing remote ban." });
    } finally {
      setIsBanning(false);
      setBanModalVisitor(null);
    }
  };

  // Remote Unban Action
  const executeUnban = async (v: Visitor) => {
    try {
      const res = await fetch("/api/admin/visitors/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: v.id,
          action: "unban",
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setNotification({
          type: "success",
          text: `Visitor ${v.id} unbanned. Access restored.`,
        });
        setVisitors((prev) =>
          prev.map((item) =>
            item.id === v.id ? { ...item, ban: { enabled: false } } : item
          )
        );
      } else {
        setNotification({ type: "error", text: (data && data.error) || "Failed to unban visitor." });
      }
    } catch {
      setNotification({ type: "error", text: "Network error while unbanning visitor." });
    }
  };

  // Cascading Delete Purge Action
  const executeDelete = async () => {
    if (!deleteModalVisitor) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/visitors/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: deleteModalVisitor.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setNotification({
          type: "success",
          text: `Visitor ${deleteModalVisitor.id} and ${data.deletedSessions} linked session records were purged.`,
        });
        setVisitors((prev) => prev.filter((v) => v.id !== deleteModalVisitor.id));
      } else {
        setNotification({ type: "error", text: (data && data.error) || "Failed to delete visitor." });
      }
    } catch {
      setNotification({ type: "error", text: "Network error while purging visitor." });
    } finally {
      setIsDeleting(false);
      setDeleteModalVisitor(null);
    }
  };

  // Appeal Action: Accept (Unban), Reject, or Hold
  const handleAppealAction = async (appealId: string, action: "accept" | "reject" | "hold") => {
    setProcessingAppealId(appealId);
    try {
      const res = await fetch("/api/admin/visitors/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealId, action }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success && data.appeal) {
        setNotification({
          type: "success",
          text: data.message || `Appeal marked as ${data.appeal.status}.`,
        });
        setAppeals((prev) =>
          prev.map((a) => (a.id === appealId ? { ...a, ...data.appeal } : a))
        );
        if (action === "accept" && data.appeal.visitorId) {
          setVisitors((prev) =>
            prev.map((v) =>
              v.id === data.appeal.visitorId ? { ...v, ban: { enabled: false } } : v
            )
          );
        }
      } else {
        setNotification({ type: "error", text: data.error || "Failed to update appeal." });
      }
    } catch {
      setNotification({ type: "error", text: "Network error while updating appeal." });
    } finally {
      setProcessingAppealId(null);
    }
  };

  // Filtered visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (statusFilter === "online" && !v.online) return false;
      if (statusFilter === "banned" && !v.ban?.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = v.id.toLowerCase().includes(q);
        const matchIp = v.currentIP?.toLowerCase().includes(q);
        const matchCountry = v.geo?.country?.toLowerCase().includes(q);
        const matchCity = v.geo?.city?.toLowerCase().includes(q);
        const matchPath = v.currentPath?.toLowerCase().includes(q);
        if (!matchId && !matchIp && !matchCountry && !matchCity && !matchPath) return false;
      }
      return true;
    });
  }, [visitors, statusFilter, searchQuery]);

  // Filtered appeals
  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => {
      if (appealFilter !== "all" && a.status !== appealFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = a.visitorId.toLowerCase().includes(q);
        const matchEmail = a.email.toLowerCase().includes(q);
        const matchName = a.name?.toLowerCase().includes(q);
        const matchMsg = a.message.toLowerCase().includes(q);
        if (!matchId && !matchEmail && !matchName && !matchMsg) return false;
      }
      return true;
    });
  }, [appeals, appealFilter, searchQuery]);

  // Pending appeals count
  const pendingAppealsCount = useMemo(() => {
    return appeals.filter((a) => a.status === "PENDING").length;
  }, [appeals]);

  // Pagination for Visitors
  const totalPages = Math.max(1, Math.ceil(filteredVisitors.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVisitors = useMemo(() => {
    return filteredVisitors.slice(startIndex, startIndex + pageSize);
  }, [filteredVisitors, startIndex, pageSize]);

  // Pagination for Appeals
  const totalAppealPages = Math.max(1, Math.ceil(filteredAppeals.length / appealPageSize));
  const startAppealIndex = (appealPage - 1) * appealPageSize;
  const paginatedAppeals = useMemo(() => {
    return filteredAppeals.slice(startAppealIndex, startAppealIndex + appealPageSize);
  }, [filteredAppeals, startAppealIndex, appealPageSize]);

  // Dynamic stats calculation
  const stats = useMemo(() => {
    const onlineCount = visitors.filter((v) => v.online).length;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const todayCount = visitors.filter((v) => (v.lastSeen || 0) >= startOfToday).length;
    const returningCount = visitors.filter((v) => (v.totalVisits || 1) > 1).length;
    const activeTotal = Math.max(visitors.length, summary.totalUnique);

    return {
      onlineNow: sseConnected ? Math.max(onlineCount, summary.onlineNow) : onlineCount,
      totalUnique: activeTotal,
      todayVisitors: Math.max(todayCount, summary.todayVisitors, activeTotal > 0 ? 1 : 0),
      returningVisitors: Math.max(returningCount, summary.returningVisitors),
    };
  }, [visitors, summary, sseConnected]);

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return "Never";
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 15) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 space-y-4 font-admin-sans pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-[2px] border text-xs font-admin-mono flex items-center justify-between transition-all duration-300 ${
            notification.type === "success"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <FaCircleCheck className="w-4 h-4 text-[#22C55E]" />
            ) : (
              <FaTriangleExclamation className="w-4 h-4 text-[#EF4444]" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="hover:opacity-70 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header with Navigation Tabs and Metrics */}
      <div className="border border-[#E5E7EB] bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              {/* Header Title Live Test 2 */}
              <h1 className="text-lg font-bold text-black tracking-tight">
                Live Visitor Intelligence
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-[10px] font-admin-mono font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? "bg-[#22C55E] animate-pulse" : "bg-amber-500"}`} />
                <span>{sseConnected ? "LIVE" : "SYNCING"}</span>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 mt-2 font-admin-mono text-xs">
              <button
                onClick={() => setActiveTab("visitors")}
                className={`px-3 py-1 rounded-[2px] transition-all flex items-center gap-1.5 font-bold ${
                  activeTab === "visitors"
                    ? "bg-black text-white"
                    : "bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]"
                }`}
              >
                <FaUsers className="w-3 h-3" />
                <span>Visitor Data ({visitors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("appeals")}
                className={`px-3 py-1 rounded-[2px] transition-all flex items-center gap-1.5 font-bold relative ${
                  activeTab === "appeals"
                    ? "bg-black text-white"
                    : "bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]"
                }`}
              >
                <FaEnvelope className="w-3 h-3" />
                <span>Ban Appeals ({appeals.length})</span>
                {pendingAppealsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                    {pendingAppealsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Inline Metric Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-admin-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]">
            <FaTowerBroadcast className="w-3 h-3 text-[#22C55E] animate-pulse" />
            <span className="font-bold">{stats.onlineNow}</span>
            <span className="text-[10px] uppercase text-[#15803D]">Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[#F9FAFB] border border-[#E5E7EB] text-black">
            <FaUsers className="w-3 h-3 text-purple-600" />
            <span className="font-bold">{stats.totalUnique}</span>
            <span className="text-[10px] uppercase text-[#64748B]">Total</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[#F9FAFB] border border-[#E5E7EB] text-black">
            <FaCalendarDay className="w-3 h-3 text-blue-600" />
            <span className="font-bold">{stats.todayVisitors}</span>
            <span className="text-[10px] uppercase text-[#64748B]">Today</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-[#F9FAFB] border border-[#E5E7EB] text-black">
            <FaRepeat className="w-3 h-3 text-amber-600" />
            <span className="font-bold">{stats.returningVisitors}</span>
            <span className="text-[10px] uppercase text-[#64748B]">Returning</span>
          </div>

          <button
            onClick={() => {
              fetchVisitors();
              fetchAppeals();
            }}
            disabled={isLoading || isLoadingAppeals || isCleaning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-black text-xs font-admin-mono transition-all ml-1 cursor-pointer"
            title="Refresh All"
          >
            <FaArrowRotateRight className={`w-3 h-3 text-[#64748B] ${isLoading || isLoadingAppeals ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSweepStaleData}
            disabled={isCleaning || isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-admin-mono transition-all cursor-pointer font-bold"
            title="Permanently prune sessions older than 24h and orphaned telemetry records"
          >
            <FaTrashCan className={`w-3 h-3 text-amber-700 ${isCleaning ? "animate-spin" : ""}`} />
            <span>{isCleaning ? "Sweeping..." : "Sweep Stale Data"}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE VISITORS TABLE */}
      {activeTab === "visitors" && (
        <div className="bg-white border border-[#E5E7EB] rounded-[2px] overflow-hidden shadow-xs">
          {/* Controls Bar */}
          <div className="px-4 py-2.5 sm:px-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFA]">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, IP, Country, Path..."
                  className="pl-8 pr-3 py-1.5 border border-[#E5E7EB] bg-white rounded-[2px] text-xs font-admin-mono focus:outline-none focus:border-black w-60 sm:w-72"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#64748B] hover:text-black font-admin-mono"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-admin-mono text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  statusFilter === "all"
                    ? "bg-black text-white font-bold"
                    : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
                }`}
              >
                All ({visitors.length})
              </button>
              <button
                onClick={() => setStatusFilter("online")}
                className={`px-2.5 py-1 rounded-[2px] transition-all flex items-center gap-1.5 text-xs ${
                  statusFilter === "online"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online ({visitors.filter((v) => v.online).length})</span>
              </button>
              <button
                onClick={() => setStatusFilter("banned")}
                className={`px-2.5 py-1 rounded-[2px] transition-all flex items-center gap-1.5 text-xs ${
                  statusFilter === "banned"
                    ? "bg-red-600 text-white font-bold"
                    : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
                }`}
              >
                <span>Banned ({visitors.filter((v) => v.ban?.enabled).length})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-admin-mono text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[#64748B] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Visitor ID / IP</th>
                  <th className="py-2.5 px-4 font-medium">Location</th>
                  <th className="py-2.5 px-4 font-medium">Device / Browser</th>
                  <th className="py-2.5 px-4 font-medium">Current Page</th>
                  <th className="py-2.5 px-4 font-medium">Visits</th>
                  <th className="py-2.5 px-4 font-medium">Last Seen</th>
                  <th className="py-2.5 px-4 font-medium">Ban State</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#9CA3AF]">
                      {isLoading ? "Synchronizing live visitor stream..." : "No visitors found."}
                    </td>
                  </tr>
                ) : (
                  paginatedVisitors.map((v) => {
                    const isBanned = v.ban?.enabled;
                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-[#F9FAFB] transition-colors ${
                          isBanned ? "bg-red-50/30" : v.online ? "bg-emerald-50/15" : ""
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          {v.online ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>ONLINE</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[#737373] text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                              <span>OFFLINE</span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-medium text-black">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{v.id}</span>
                            <button
                              onClick={() => handleCopyId(v.id)}
                              className="text-[#9CA3AF] hover:text-black transition-colors"
                              title="Copy Visitor ID"
                            >
                              {copiedId === v.id ? (
                                <FaCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <FaCopy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-[#64748B]">{v.currentIP || "Unknown IP"}</div>
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="font-medium text-black">
                            {v.geo?.city ? `${v.geo.city}, ` : ""}
                            {v.geo?.country || "Local"}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {v.geo?.state || v.geo?.isp || "Direct"}
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1 text-black font-medium">
                            {v.device?.type === "mobile" ? (
                              <FaMobileScreen className="w-3 h-3 text-[#64748B]" />
                            ) : v.device?.type === "tablet" ? (
                              <FaTabletScreenButton className="w-3 h-3 text-[#64748B]" />
                            ) : (
                              <FaDesktop className="w-3 h-3 text-[#64748B]" />
                            )}
                            <span>
                              {v.device?.os || "Windows"} {v.device?.architecture ? `(${v.device.architecture})` : ""}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {v.browser?.name || "Browser"} {v.browser?.version ? `v${v.browser.version.split(".")[0]}` : ""}
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-[11px] max-w-[140px] truncate" title={v.currentPath}>
                            {v.currentPath || "/"}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 font-medium text-black">
                          <div>{v.totalVisits || 1} visits</div>
                          <div className="text-[10px] text-[#64748B]">{v.totalPages || 1} views</div>
                        </td>

                        <td className="py-2.5 px-4 text-[#64748B]">
                          <div className="font-medium text-black">{formatRelativeTime(v.lastSeen)}</div>
                          <div className="text-[10px]">First: {formatRelativeTime(v.firstSeen)}</div>
                        </td>

                        <td className="py-2.5 px-4">
                          {isBanned ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 border border-red-200 text-red-700 text-[10px] font-bold">
                              <FaBan className="w-2.5 h-2.5" />
                              <span>BANNED</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-[#52525B] text-[10px]">
                              <FaShieldHalved className="w-2.5 h-2.5 text-[#22C55E]" />
                              <span>Active</span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isBanned ? (
                              <button
                                onClick={() => executeUnban(v)}
                                className="px-2.5 py-1 rounded-[2px] bg-white border border-[#E5E7EB] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-black text-[11px] font-bold transition-all"
                              >
                                UNBAN
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setBanModalVisitor(v);
                                  setBanReasonInput("Access permanently revoked by administrator");
                                }}
                                className="px-2.5 py-1 rounded-[2px] bg-white border border-red-200 hover:bg-red-600 hover:text-white text-red-600 text-[11px] font-bold transition-all"
                              >
                                BAN
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteModalVisitor(v)}
                              className="p-1.5 rounded-[2px] hover:bg-neutral-100 text-[#9CA3AF] hover:text-red-600 transition-colors"
                              title="Cascading Purge Visitor"
                            >
                              <FaTrashCan className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 sm:px-5 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-admin-mono">
            <div className="flex items-center gap-3 text-[#64748B]">
              <span>
                Showing <strong className="text-black">{filteredVisitors.length === 0 ? 0 : startIndex + 1}</strong> to{" "}
                <strong className="text-black">{Math.min(startIndex + pageSize, filteredVisitors.length)}</strong> of{" "}
                <strong className="text-black">{filteredVisitors.length}</strong> visitors
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-[#E5E7EB] rounded-[2px] bg-white text-black text-xs font-admin-mono focus:outline-none focus:border-black"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 px-2.5 rounded-[2px] border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-black disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center gap-1"
              >
                <FaChevronLeft className="w-2.5 h-2.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-[2px] text-xs font-admin-mono transition-all ${
                        currentPage === page
                          ? "bg-black text-white font-bold"
                          : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 px-2.5 rounded-[2px] border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-black disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <FaChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BAN APPEALS TABLE */}
      {activeTab === "appeals" && (
        <div className="bg-white border border-[#E5E7EB] rounded-[2px] overflow-hidden shadow-xs">
          {/* Appeals Controls */}
          <div className="px-4 py-2.5 sm:px-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFA]">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter appeals by ID, email, keyword..."
                  className="pl-8 pr-3 py-1.5 border border-[#E5E7EB] bg-white rounded-[2px] text-xs font-admin-mono focus:outline-none focus:border-black w-60 sm:w-72"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#64748B] hover:text-black font-admin-mono"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-admin-mono text-xs">
              <button
                onClick={() => setAppealFilter("all")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  appealFilter === "all"
                    ? "bg-black text-white font-bold"
                    : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
                }`}
              >
                All ({appeals.length})
              </button>
              <button
                onClick={() => setAppealFilter("PENDING")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  appealFilter === "PENDING"
                    ? "bg-amber-500 text-white font-bold"
                    : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                }`}
              >
                Pending ({appeals.filter((a) => a.status === "PENDING").length})
              </button>
              <button
                onClick={() => setAppealFilter("HOLD")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  appealFilter === "HOLD"
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
                }`}
              >
                On Hold ({appeals.filter((a) => a.status === "HOLD").length})
              </button>
              <button
                onClick={() => setAppealFilter("ACCEPTED")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  appealFilter === "ACCEPTED"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                }`}
              >
                Accepted ({appeals.filter((a) => a.status === "ACCEPTED").length})
              </button>
              <button
                onClick={() => setAppealFilter("REJECTED")}
                className={`px-2.5 py-1 rounded-[2px] transition-all text-xs ${
                  appealFilter === "REJECTED"
                    ? "bg-red-600 text-white font-bold"
                    : "bg-white text-red-700 hover:bg-red-50 border border-red-200"
                }`}
              >
                Rejected ({appeals.filter((a) => a.status === "REJECTED").length})
              </button>
            </div>
          </div>

          {/* Appeals List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-admin-mono text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[#64748B] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Visitor ID / Contact</th>
                  <th className="py-2.5 px-4 font-medium">Ban Reason</th>
                  <th className="py-2.5 px-4 font-medium">Visitor Statement</th>
                  <th className="py-2.5 px-4 font-medium">Submitted</th>
                  <th className="py-2.5 px-4 font-medium text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedAppeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#9CA3AF]">
                      {isLoadingAppeals ? "Loading appeals from Cloud Firestore..." : "No ban appeals found."}
                    </td>
                  </tr>
                ) : (
                  paginatedAppeals.map((appeal) => {
                    const isProcessing = processingAppealId === appeal.id;
                    return (
                      <tr key={appeal.id} className="hover:bg-[#F9FAFB] transition-colors">
                        {/* Status Badge */}
                        <td className="py-2.5 px-4">
                          {appeal.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>PENDING</span>
                            </span>
                          ) : appeal.status === "HOLD" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                              <FaPause className="w-2.5 h-2.5 text-blue-500" />
                              <span>ON HOLD</span>
                            </span>
                          ) : appeal.status === "ACCEPTED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <FaCheck className="w-2.5 h-2.5 text-emerald-500" />
                              <span>ACCEPTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold">
                              <FaCircleXmark className="w-2.5 h-2.5 text-red-500" />
                              <span>REJECTED</span>
                            </span>
                          )}
                        </td>

                        {/* Visitor ID & Contact */}
                        <td className="py-2.5 px-4 font-medium text-black">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{appeal.visitorId}</span>
                            <button
                              onClick={() => handleCopyId(appeal.visitorId)}
                              className="text-[#9CA3AF] hover:text-black"
                              title="Copy ID"
                            >
                              <FaCopy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-purple-700 font-semibold">{appeal.email}</div>
                          {appeal.name && <div className="text-[10px] text-[#64748B]">{appeal.name}</div>}
                        </td>

                        {/* Ban Reason */}
                        <td className="py-2.5 px-4 text-[#64748B] max-w-[160px]">
                          <span className="truncate block text-red-600 font-medium" title={appeal.banReason}>
                            {appeal.banReason || "Policy Violation"}
                          </span>
                        </td>

                        {/* Visitor Statement */}
                        <td className="py-2.5 px-4 max-w-xs">
                          <p className="text-black font-sans text-xs line-clamp-2 leading-tight" title={appeal.message}>
                            &ldquo;{appeal.message}&rdquo;
                          </p>
                        </td>

                        {/* Submitted */}
                        <td className="py-2.5 px-4 text-[#64748B]">
                          <div>{formatRelativeTime(appeal.submittedAt)}</div>
                          <div className="text-[10px]">{new Date(appeal.submittedAt).toLocaleDateString()}</div>
                        </td>

                        {/* Action Buttons: Accept / Hold / Reject */}
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {appeal.status !== "ACCEPTED" && (
                              <button
                                onClick={() => handleAppealAction(appeal.id, "accept")}
                                disabled={isProcessing}
                                className="px-2 py-1 rounded-[2px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Accept appeal and immediately restore visitor access"
                              >
                                <FaCheck className="w-2.5 h-2.5" />
                                <span>ACCEPT</span>
                              </button>
                            )}

                            {appeal.status !== "HOLD" && appeal.status !== "ACCEPTED" && (
                              <button
                                onClick={() => handleAppealAction(appeal.id, "hold")}
                                disabled={isProcessing}
                                className="px-2 py-1 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Place on Hold for further evaluation"
                              >
                                <FaPause className="w-2.5 h-2.5" />
                                <span>HOLD</span>
                              </button>
                            )}

                            {appeal.status !== "REJECTED" && appeal.status !== "ACCEPTED" && (
                              <button
                                onClick={() => handleAppealAction(appeal.id, "reject")}
                                disabled={isProcessing}
                                className="px-2 py-1 rounded-[2px] bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Reject appeal (keep ban active)"
                              >
                                <FaXmark className="w-2.5 h-2.5" />
                                <span>REJECT</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Appeals Pagination Footer */}
          <div className="px-4 py-3 sm:px-5 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-admin-mono">
            <div className="flex items-center gap-3 text-[#64748B]">
              <span>
                Showing <strong className="text-black">{filteredAppeals.length === 0 ? 0 : startAppealIndex + 1}</strong> to{" "}
                <strong className="text-black">{Math.min(startAppealIndex + appealPageSize, filteredAppeals.length)}</strong> of{" "}
                <strong className="text-black">{filteredAppeals.length}</strong> appeals
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={appealPageSize}
                  onChange={(e) => setAppealPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-[#E5E7EB] rounded-[2px] bg-white text-black text-xs font-admin-mono focus:outline-none focus:border-black"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setAppealPage((prev) => Math.max(1, prev - 1))}
                disabled={appealPage <= 1}
                className="p-1.5 px-2.5 rounded-[2px] border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-black disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center gap-1"
              >
                <FaChevronLeft className="w-2.5 h-2.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalAppealPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setAppealPage(page)}
                    className={`w-7 h-7 rounded-[2px] text-xs font-admin-mono transition-all ${
                      appealPage === page
                        ? "bg-black text-white font-bold"
                        : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F3F4F6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAppealPage((prev) => Math.min(totalAppealPages, prev + 1))}
                disabled={appealPage >= totalAppealPages}
                className="p-1.5 px-2.5 rounded-[2px] border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-black disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <FaChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Ban Modal */}
      {banModalVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-md rounded-[2px] p-6 shadow-xl space-y-4 font-admin-sans">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <FaBan className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-black text-sm">Remote Visitor Lockout</h3>
              </div>
              <button
                onClick={() => setBanModalVisitor(null)}
                className="text-[#9CA3AF] hover:text-black"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-admin-mono text-xs">
              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">Target Visitor ID</span>
                <span className="font-bold text-black">{banModalVisitor.id}</span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">IP / Geo</span>
                <span className="text-black">
                  {banModalVisitor.currentIP} • {banModalVisitor.geo?.country}
                </span>
              </div>

              <div>
                <label className="text-[#64748B] block text-[10px] uppercase mb-1">
                  Enforcement Reason
                </label>
                <textarea
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-[#E5E7EB] rounded-[2px] text-xs font-admin-mono focus:outline-none focus:border-red-500"
                  placeholder="Specify policy violation reason..."
                />
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] font-admin-mono rounded-[2px]">
              ▲ When confirmed, an instantaneous server packet will lock the visitor&apos;s screen in real time, and Edge Middleware will block all future requests.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanModalVisitor(null)}
                className="px-4 py-2 border border-[#E5E7EB] rounded-[2px] text-xs font-admin-mono hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                onClick={executeBan}
                disabled={isBanning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[2px] text-xs font-admin-mono font-bold uppercase tracking-wider flex items-center gap-2"
              >
                {isBanning ? "Executing Ban..." : "Enforce Remote Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cascading Delete Modal */}
      {deleteModalVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-md rounded-[2px] p-6 shadow-xl space-y-4 font-admin-sans">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <FaTrashCan className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-black text-sm">Permanent Cascading Deletion</h3>
              </div>
              <button
                onClick={() => setDeleteModalVisitor(null)}
                className="text-[#9CA3AF] hover:text-black"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#52525B] font-admin-sans leading-relaxed">
              Are you sure you want to permanently purge visitor{" "}
              <strong className="font-mono text-black">{deleteModalVisitor.id}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-admin-mono rounded-[2px]">
              ▲ This action atomically purges the visitor document, all linked session records in <code className="text-black font-bold">visitor_sessions</code>, memory presence, and active SSE subscriptions with zero orphan records left behind.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalVisitor(null)}
                className="px-4 py-2 border border-[#E5E7EB] rounded-[2px] text-xs font-admin-mono hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-[2px] text-xs font-admin-mono font-bold uppercase tracking-wider"
              >
                {isDeleting ? "Purging..." : "Confirm Purge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
