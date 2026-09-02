"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
  FaShieldHalved,
  FaTrashCan,
  FaRotateRight,
  FaEye,
  FaTriangleExclamation,
  FaCheck,
  FaXmark,
  FaSeedling,
  FaChevronDown,
  FaChevronRight,
  FaCircleCheck,
  FaWrench,
  FaBolt,
  FaClockRotateLeft,
  FaKey,
  FaEnvelope,
  FaCircleNotch,
  FaArrowRotateRight,
} from "react-icons/fa6";
import {
  auditDatabaseAction,
  generatePlanAction,
  dryRunAction,
  requestLifecycleOtpAction,
  resendLifecycleOtpAction,
  executeLifecycleWithOtpAction,
  getExecutionHistoryAction,
} from "@/lib/actions/purge.actions";
import type {
  DatabaseAuditReport,
  LifecycleExecutionPlan,
  LifecycleExecutionReceipt,
  LifecycleOperationType,
} from "@/lib/dal/lifecycle/orchestrator";
import type { LifecycleOtpChallengePublic } from "@/lib/dal/lifecycle/lifecycle-otp.service";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

interface DatabasePurgeCanvasProps {
  initialAudit: DatabaseAuditReport | null;
  initialHistory?: LifecycleExecutionReceipt[];
  initialNextCursor?: string;
}

export const DatabasePurgeCanvas: React.FC<DatabasePurgeCanvasProps> = ({
  initialAudit,
  initialHistory = [],
  initialNextCursor,
}) => {
  const [audit, setAudit] = useState<DatabaseAuditReport | null>(initialAudit);
  const [history, setHistory] = useState<LifecycleExecutionReceipt[]>(initialHistory);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [receipt, setReceipt] = useState<LifecycleExecutionReceipt | null>(null);
  const [plan, setPlan] = useState<LifecycleExecutionPlan | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Active Execution Progress Tracking (Real backend milestones)
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSeconds, setExecutionSeconds] = useState(0);

  // Advanced accordion & History modal state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedHistoryReceipt, setSelectedHistoryReceipt] = useState<LifecycleExecutionReceipt | null>(null);

  // Modal State & 2-Step OTP Security Flow
  const [activeModal, setActiveModal] = useState<LifecycleOperationType | null>(null);
  const [modalStep, setModalStep] = useState<"PREFLIGHT" | "OTP_VERIFY">("PREFLIGHT");
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);

  // OTP Challenge & Digits
  const [otpChallenge, setOtpChallenge] = useState<LifecycleOtpChallengePublic | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(0);
  const [expiresCountdownSec, setExpiresCountdownSec] = useState<number>(300);
  const [isShaking, setIsShaking] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Resend & Expiry Timers
  useEffect(() => {
    if (modalStep !== "OTP_VERIFY" || !otpChallenge) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const resendLeft = Math.max(0, Math.ceil((otpChallenge.resendAvailableAt - now) / 1000));
      const expiresLeft = Math.max(0, Math.ceil((otpChallenge.expiresAt - now) / 1000));

      setResendCooldownSec(resendLeft);
      setExpiresCountdownSec(expiresLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [modalStep, otpChallenge]);

  // 2. Focus first digit on OTP step transition
  useEffect(() => {
    if (modalStep === "OTP_VERIFY") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
    }
  }, [modalStep]);

  // Refresh Audit
  const handleRefreshAudit = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await auditDatabaseAction();
      if (res.success && res.data) {
        setAudit(res.data);
      } else {
        setActionError(res.error || "Failed to refresh database audit.");
      }
    });
  };

  // Open Modal with Preflight Plan
  const openOperationModal = (op: LifecycleOperationType) => {
    setActionError(null);
    setOtpError(null);
    setActiveModal(op);
    setModalStep("PREFLIGHT");
    setConfirmUnderstood(false);
    setOtpChallenge(null);
    setOtpDigits(["", "", "", "", "", ""]);

    startTransition(async () => {
      const planRes = await generatePlanAction(op);
      if (planRes.success && planRes.data) {
        setPlan(planRes.data);
      }
    });
  };

  // Close Modals
  const closeModal = () => {
    if (isExecuting) return;
    setActiveModal(null);
    setPlan(null);
    setModalStep("PREFLIGHT");
    setConfirmUnderstood(false);
    setOtpChallenge(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError(null);
  };

  // Step 1 -> Step 2: Request Security Passcode via Brevo
  const handleRequestOtp = async () => {
    if (!audit || !activeModal || !confirmUnderstood || isRequestingOtp) return;
    setIsRequestingOtp(true);
    setOtpError(null);

    const targetSummary = plan
      ? {
          dynamicCount: plan.currentCounts.dynamic,
          staticCount: plan.currentCounts.staticCanonical,
          redisKeysCount: plan.currentCounts.redisKeys,
        }
      : undefined;

    const res = await requestLifecycleOtpAction({
      operation: activeModal,
      auditFingerprint: audit.auditFingerprint,
      targetSummary,
    });

    setIsRequestingOtp(false);

    if (res.success && res.data) {
      setOtpChallenge(res.data);
      setModalStep("OTP_VERIFY");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldownSec(Math.max(0, Math.ceil((res.data.resendAvailableAt - Date.now()) / 1000)));
      setExpiresCountdownSec(Math.max(0, Math.ceil((res.data.expiresAt - Date.now()) / 1000)));
    } else {
      setOtpError(res.error || "Failed to dispatch authorization passcode.");
    }
  };

  // Handle OTP 6-Box Input
  const handleOtpDigitChange = (index: number, val: string) => {
    const char = val.replace(/[^0-9]/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);
    setOtpError(null);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "Enter") {
      if (otpDigits.join("").length === 6) {
        handleVerifyAndExecute();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    setOtpError(null);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Resend OTP Passcode
  const handleResendOtp = async () => {
    if (!otpChallenge || resendCooldownSec > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpError(null);

    const res = await resendLifecycleOtpAction(otpChallenge.challengeId);
    setIsResendingOtp(false);

    if (res.success && res.data) {
      setOtpChallenge(res.data);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldownSec(Math.max(0, Math.ceil((res.data.resendAvailableAt - Date.now()) / 1000)));
      setExpiresCountdownSec(Math.max(0, Math.ceil((res.data.expiresAt - Date.now()) / 1000)));
      otpInputRefs.current[0]?.focus();
    } else {
      setOtpError(res.error || "Failed to resend authorization passcode.");
    }
  };

  // Execute Dry Run
  const handleDryRun = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await dryRunAction("CLEAN");
      if (res.success && res.data) {
        setReceipt(res.data);
        setShowAdvanced(true);
      } else {
        setActionError(res.error || "Failed to execute dry run simulation.");
      }
    });
  };

  // Fetch More History
  const handleLoadMoreHistory = () => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const res = await getExecutionHistoryAction(10, nextCursor);
      if (res.success && res.data) {
        setHistory((prev) => [...prev, ...res.data!.receipts]);
        setNextCursor(res.data.nextCursor);
      }
    });
  };

  // Milestone mapping: 6 UI Milestones
  const UI_MILESTONES = [
    { label: "Precheck", desc: "Verifying policy and security authorization" },
    { label: "Audit & Lock", desc: "State inventory & acquiring exclusive lifecycle lock" },
    { label: "Execute", desc: "Dependency-aware multi-store mutations" },
    { label: "Synchronize", desc: "Broadcasting Realtime CMS sync signals" },
    { label: "Verify", desc: "Set-based zero-drift integrity verification" },
    { label: "Finalize", desc: "Persisting execution receipt & releasing lock" },
  ];

  // Step 2: Verify OTP & Trigger Dynamic Execution Progress Engine
  const handleVerifyAndExecute = async () => {
    const fullOtp = otpDigits.join("");
    if (!audit || !activeModal || !otpChallenge || fullOtp.length !== 6 || isExecuting) return;

    const targetOp = activeModal;
    const fingerprint = audit.auditFingerprint;
    const challengeId = otpChallenge.challengeId;

    setActionError(null);
    setOtpError(null);
    setIsExecuting(true);
    setActiveStageIndex(1);
    setActiveModal(null); // close modal and show dynamic progress engine
    setExecutionSeconds(0);

    const timer = setInterval(() => {
      setExecutionSeconds((sec) => sec + 1);
    }, 1000);

    const stageInterval = setInterval(() => {
      setActiveStageIndex((prev) => (prev < 5 ? prev + 1 : prev));
    }, 450);

    startTransition(async () => {
      try {
        const res = await executeLifecycleWithOtpAction({
          challengeId,
          otp: fullOtp,
          operation: targetOp,
          auditFingerprint: fingerprint,
        });

        clearInterval(stageInterval);
        clearInterval(timer);
        setActiveStageIndex(6);

        if (res.success && res.data) {
          setReceipt(res.data);
          // Refresh audit and history
          const [refreshedAudit, refreshedHistory] = await Promise.all([
            auditDatabaseAction(),
            getExecutionHistoryAction(10),
          ]);
          if (refreshedAudit.data) setAudit(refreshedAudit.data);
          if (refreshedHistory.data) {
            setHistory(refreshedHistory.data.receipts);
            setNextCursor(refreshedHistory.data.nextCursor);
          }
        } else {
          setActionError(res.error || `Lifecycle operation ${targetOp} failed.`);
          // Trigger shake and re-open modal on error
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
      } catch (err: unknown) {
        clearInterval(stageInterval);
        clearInterval(timer);
        setActionError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsExecuting(false);
      }
    });
  };

  const isOtpComplete = otpDigits.join("").length === 6;

  return (
    <div className="space-y-6 w-full">
      {/* 1. Top Bar: Environment & Secondary Refresh */}
      <div className="flex items-center justify-between p-3.5 bg-white border border-[#E2E8F0] rounded-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              audit?.isDestructiveAllowed ? "bg-[#16A34A]" : "bg-[#DC2626]"
            }`}
          />
          <span className="text-xs font-bold font-admin-sans text-black">
            {audit?.environment.toUpperCase() || "DEVELOPMENT"}
          </span>
          <span className="text-xs text-[#64748B] font-admin-mono">
            ({audit?.projectId || "gaurav-portfolio-improved"})
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-[#F1F5F9] text-[#475569] font-admin-mono rounded-xs font-semibold">
            {audit?.isDestructiveAllowed ? "Lifecycle Operations Enabled" : "Reset Disabled"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefreshAudit}
          disabled={isPending || isExecuting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-sans font-medium text-[#475569] hover:text-black bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
          title="Run non-destructive audit scan"
        >
          <FaRotateRight className={`w-3 h-3 ${isPending && !isExecuting ? "animate-spin" : ""}`} />
          <span>Refresh Audit</span>
          <ButtonHelpBadge text={BUTTON_HELP.DATABASE_AUDIT} position="bottom" />
        </button>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-sm flex items-start gap-2.5 text-[#DC2626] text-xs font-admin-sans">
          <FaTriangleExclamation className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Lifecycle Error: </span>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[#DC2626] hover:opacity-75 cursor-pointer"
          >
            <FaXmark className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. System State & Security Banner */}
      <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
            <FaShieldHalved className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-admin-sans text-black">
                State Fingerprint:
              </span>
              <span className="text-xs font-admin-mono font-semibold text-[#7C3AED]">
                {audit?.auditFingerprint.slice(0, 16)}...
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-admin-sans">
              Defense-in-depth: Superadmin authentication is 100% immune to all lifecycle actions. OTP authorization required for all operations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDryRun}
            disabled={isPending || isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-sans font-medium text-[#475569] hover:text-black bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <FaEye className="w-3 h-3 text-[#2563EB]" />
            <span>Simulate Dry Run</span>
            <ButtonHelpBadge text={BUTTON_HELP.DRY_RUN} position="bottom" />
          </button>
        </div>
      </div>

      {/* 3. Four Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: System State */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-admin-sans font-medium">
            <span>Lifecycle Health</span>
            <span
              className={`px-1.5 py-0.5 rounded-xs text-[10px] font-admin-mono font-bold uppercase ${
                audit?.systemState === "READY"
                  ? "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]"
                  : audit?.systemState === "DRIFT_DETECTED"
                  ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                  : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
              }`}
            >
              {audit?.systemState || "READY"}
            </span>
          </div>
          <div className="text-xl font-bold font-admin-sans text-black">
            {audit?.totalProtectedAuthDocuments ?? 0} Protected Docs
          </div>
          <div className="text-[11px] text-[#16A34A] font-admin-mono">
            4 Auth collections • 0 Byte drift
          </div>
        </div>

        {/* Card 2: Static Canonical Pillars */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-admin-sans font-medium">
            <span>Portfolio Content</span>
            <span className="text-[10px] font-admin-mono text-[#7C3AED] font-semibold">
              14 Pillars
            </span>
          </div>
          <div className="text-xl font-bold font-admin-sans text-black">
            {audit?.totalStaticCanonicalDocuments ?? 0} / 37 Docs
          </div>
          <div className="text-[11px] text-[#64748B] font-admin-mono">
            {audit?.totalStaticCanonicalDocuments === 37 ? "100% Canonical Seeded" : "Missing Pillars Detected"}
          </div>
        </div>

        {/* Card 3: Dynamic Records */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-admin-sans font-medium">
            <span>Dynamic Data</span>
            <span className="text-[10px] font-admin-mono text-[#DC2626] font-semibold">
              Primary Target
            </span>
          </div>
          <div className="text-xl font-bold font-admin-sans text-black">
            {audit?.totalDynamicDocuments ?? 0} Records
          </div>
          <div className="text-[11px] text-[#64748B] font-admin-mono">
            Inquiries, Mails, Chats, Drafts
          </div>
        </div>

        {/* Card 4: Redis & RTDB Cache */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-admin-sans font-medium">
            <span>Redis & RTDB</span>
            <span className="text-[10px] font-admin-mono text-[#0284C7] font-semibold">
              Disposable
            </span>
          </div>
          <div className="text-xl font-bold font-admin-sans text-black">
            {audit?.redisHealth.dbsize ?? 0} Keys
          </div>
          <div className="text-[11px] text-[#64748B] font-admin-mono">
            RTDB Lead Counter #{audit?.rtdbLeadCount ?? 0}
          </div>
        </div>
      </div>

      {/* 4. Two Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action 1: CLEAN DATABASE */}
        <div className="p-5 bg-white border-2 border-[#FECACA] rounded-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                <FaTrashCan className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold font-admin-sans text-[#DC2626]">
                Clean Database
              </h3>
            </div>
            <span className="text-[10px] font-admin-mono font-bold uppercase px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] rounded-xs">
              Primary Clean
            </span>
          </div>

          <p className="text-xs text-[#475569] font-admin-sans leading-relaxed">
            Wipes all disposable dynamic records (inquiries, mails, chats, drafts) to exactly <strong>0</strong> and flushes Redis cache namespaces. Preserves all 14 canonical static portfolio pillars and superadmin authentication 100% intact.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => openOperationModal("CLEAN")}
              disabled={isPending || isExecuting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-admin-sans font-semibold rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FaShieldHalved className="w-3.5 h-3.5" />
              <span>Clean Database (Dynamic = 0)</span>
              <ButtonHelpBadge text={BUTTON_HELP.PURGE_DATABASE} position="top" />
            </button>
          </div>
        </div>

        {/* Action 2: SEED STATIC PILLARS */}
        <div className="p-5 bg-white border-2 border-[#DDD6FE] rounded-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                <FaSeedling className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold font-admin-sans text-[#7C3AED]">
                Seed Static Pillars
              </h3>
            </div>
            <span className="text-[10px] font-admin-mono font-bold uppercase px-2 py-0.5 bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] rounded-xs">
              Authoritative Seed
            </span>
          </div>

          <p className="text-xs text-[#475569] font-admin-sans leading-relaxed">
            Populates all <strong>14 canonical static portfolio pillars (37 documents)</strong> into Firestore as pure production content. Generates <strong>0 fake/dummy data</strong>. Emits verified dual-channel realtime CMS invalidation signals.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => openOperationModal("SEED")}
              disabled={isPending || isExecuting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-sans font-semibold rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FaShieldHalved className="w-3.5 h-3.5" />
              <span>Seed Static Pillars (14 Pillars)</span>
              <ButtonHelpBadge text={BUTTON_HELP.SEED_STATIC_PILLARS} position="top" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Dynamic Truthful Progress Engine (During Active Execution) */}
      {isExecuting && (
        <div className="p-6 bg-white border-2 border-[#2563EB] rounded-sm shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaCircleNotch className="w-5 h-5 text-[#2563EB] animate-spin" />
              <div>
                <h4 className="text-sm font-bold font-admin-sans text-black">
                  Executing Transaction-Like Lifecycle Pipeline
                </h4>
                <p className="text-xs text-[#64748B] font-admin-sans">
                  Coordinating Firestore, Realtime Database, and Redis with strict execution lock.
                </p>
              </div>
            </div>
            <div className="text-xs font-admin-mono font-bold px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-xs">
              Elapsed: {executionSeconds}s
            </div>
          </div>

          {/* 6 Milestones Stepper */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
            {UI_MILESTONES.map((milestone, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = activeStageIndex > stepNumber;
              const isCurrent = activeStageIndex === stepNumber;

              return (
                <div
                  key={milestone.label}
                  className={`p-2.5 rounded-xs border text-left transition-all ${
                    isCompleted
                      ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
                      : isCurrent
                      ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] ring-1 ring-[#2563EB]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-admin-mono font-bold">
                      0{stepNumber}
                    </span>
                    {isCompleted ? (
                      <FaCheck className="w-3 h-3 text-[#16A34A]" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                    ) : null}
                  </div>
                  <div className="text-xs font-bold font-admin-sans truncate">
                    {milestone.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Success Receipt View */}
      {receipt && !isExecuting && (
        <div className="p-6 bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-sm space-y-4 animate-in fade-in duration-200 text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#DCFCE7] border border-[#86EFAC] flex items-center justify-center text-[#16A34A]">
                <FaCircleCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-admin-sans text-[#16A34A]">
                  Lifecycle Operation Succeeded: {receipt.operation}
                </h4>
                <p className="text-xs text-[#475569] font-admin-mono">
                  Receipt ID: {receipt.executionId} • Total Duration: {receipt.durationMs}ms
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="text-xs text-[#64748B] hover:text-black font-admin-sans font-medium px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {/* Receipt Stats Table */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-admin-mono bg-white p-3.5 border border-[#BBF7D0] rounded-xs">
            <div>
              <span className="text-[#64748B] block text-[10px]">AUTH INTEGRITY</span>
              <span className="font-bold text-[#16A34A]">
                {receipt.authIntegrityVerification?.isMatch ? "100% IMMUNE" : "DRIFT"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[10px]">STATIC CONTENT</span>
              <span className="font-bold text-[#7C3AED]">
                {receipt.afterState?.staticCanonicalDocumentsCount ?? 37} Docs Seeded
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[10px]">DYNAMIC PURGED</span>
              <span className="font-bold text-[#DC2626]">
                {receipt.mutationSummary?.firestoreDeletedDocs ?? 0} Docs Removed
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[10px]">REDIS FLUSHED</span>
              <span className="font-bold text-[#0284C7]">
                {receipt.mutationSummary?.redisKeysRemoved ?? 0} Keys Removed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Advanced Operations Accordion */}
      <div className="border border-[#E2E8F0] rounded-sm bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors cursor-pointer text-left border-b border-[#E2E8F0]"
        >
          <div className="flex items-center gap-2.5">
            <FaWrench className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-xs font-bold font-admin-sans text-black">
              Advanced Operations & State Reconciliation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B] font-admin-mono">
              Reset, Reseed, Reconcile
            </span>
            {showAdvanced ? (
              <FaChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            ) : (
              <FaChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
            )}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reset to 0 */}
              <div className="p-4 border border-[#FECACA] bg-[#FEF2F2]/30 rounded-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#DC2626]">
                  <FaBolt className="w-3 h-3" />
                  <span>Total Database Reset</span>
                </div>
                <p className="text-[11px] text-[#475569] font-admin-sans leading-relaxed">
                  Wipes all dynamic application records and static content to 0. Preserves superadmin authentication.
                </p>
                <button
                  type="button"
                  onClick={() => openOperationModal("RESET")}
                  disabled={isPending || isExecuting}
                  className="w-full mt-2 px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-admin-sans font-semibold rounded-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <FaShieldHalved className="w-3 h-3" />
                  <span>Reset All Content to 0</span>
                </button>
              </div>

              {/* Reseed */}
              <div className="p-4 border border-[#DDD6FE] bg-[#F5F3FF]/30 rounded-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#7C3AED]">
                  <FaSeedling className="w-3 h-3" />
                  <span>Reseed Canonical Pillars</span>
                </div>
                <p className="text-[11px] text-[#475569] font-admin-sans leading-relaxed">
                  Overwrites and restores all 14 static canonical pillars idempotently from authoritative seed data.
                </p>
                <button
                  type="button"
                  onClick={() => openOperationModal("RESEED")}
                  disabled={isPending || isExecuting}
                  className="w-full mt-2 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-sans font-semibold rounded-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <FaShieldHalved className="w-3 h-3" />
                  <span>Reseed 14 Pillars</span>
                </button>
              </div>

              {/* Reconcile */}
              <div className="p-4 border border-[#BAE6FD] bg-[#F0F9FF]/30 rounded-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7]">
                  <FaWrench className="w-3 h-3" />
                  <span>Reconcile System Drift</span>
                </div>
                <p className="text-[11px] text-[#475569] font-admin-sans leading-relaxed">
                  Detects and fixes missing canonical pillars across Firestore, RTDB, and Redis.
                </p>
                <button
                  type="button"
                  onClick={() => openOperationModal("RECONCILE")}
                  disabled={isPending || isExecuting}
                  className="w-full mt-2 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-admin-sans font-semibold rounded-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <FaShieldHalved className="w-3 h-3" />
                  <span>Reconcile & Repair</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8. Execution History Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaClockRotateLeft className="w-3.5 h-3.5 text-[#64748B]" />
            <h4 className="text-xs font-bold font-admin-sans text-black">
              Recent Execution Receipts
            </h4>
          </div>
          <span className="text-[11px] font-admin-mono text-[#64748B]">
            Persisted in lifecycle_executions
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] font-admin-sans">
            No lifecycle operations recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-admin-sans">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-admin-mono uppercase text-[#64748B]">
                <tr>
                  <th className="p-3">Execution ID</th>
                  <th className="p-3">Operation</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-admin-mono text-[11px]">
                {history.map((item) => (
                  <tr key={item.executionId} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-3 font-semibold text-black truncate max-w-[180px]">
                      {item.executionId}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${
                          item.operation === "CLEAN" || item.operation === "RESET"
                            ? "bg-[#FEF2F2] text-[#DC2626]"
                            : "bg-[#F5F3FF] text-[#7C3AED]"
                        }`}
                      >
                        {item.operation}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${
                          item.status === "VERIFIED_SUCCESS"
                            ? "bg-[#F0FDF4] text-[#16A34A]"
                            : item.status === "PARTIAL_SUCCESS"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#FEF2F2] text-[#DC2626]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#64748B]">{item.durationMs}ms</td>
                    <td className="p-3 text-[#64748B]">
                      {new Date(item.completedAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryReceipt(item)}
                        className="px-2 py-1 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xs text-[10px] font-medium text-black cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && (
          <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center">
            <button
              type="button"
              onClick={handleLoadMoreHistory}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-admin-sans font-medium text-[#475569] hover:text-black bg-white border border-[#CBD5E1] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Load Older Receipts
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 9. TWO-STEP SINGLE-VIEW NO-SCROLL PREFLIGHT & OTP MODAL */}
      {/* ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`bg-white border border-[#E2E8F0] w-full max-w-lg rounded-sm shadow-2xl p-6 relative text-black ${
              isShaking ? "animate-shake" : "animate-in zoom-in-95 duration-150"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                    activeModal === "CLEAN" || activeModal === "RESET"
                      ? "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
                      : "bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED]"
                  }`}
                >
                  {modalStep === "OTP_VERIFY" ? (
                    <FaKey className="w-4 h-4" />
                  ) : activeModal === "CLEAN" || activeModal === "RESET" ? (
                    <FaTrashCan className="w-4 h-4" />
                  ) : (
                    <FaSeedling className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold font-admin-sans text-black">
                    {modalStep === "OTP_VERIFY"
                      ? `Authorize ${activeModal}`
                      : `Confirm ${activeModal}?`}
                  </h3>
                  <span className="text-[10px] font-admin-mono font-semibold uppercase text-[#64748B]">
                    {modalStep === "OTP_VERIFY"
                      ? "Superadmin Security Passcode Gate"
                      : "Preflight Target Diff Analysis"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending || isExecuting || isRequestingOtp}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {otpError && (
              <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xs text-xs font-admin-sans text-[#DC2626] flex items-center gap-2">
                <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{otpError}</span>
              </div>
            )}

            {/* STEP 1: PREFLIGHT DIFF */}
            {modalStep === "PREFLIGHT" && (
              <div className="space-y-4">
                {/* Current vs Target Diff Table */}
                {plan && (
                  <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-2 text-xs font-admin-sans">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 text-[10px] font-admin-mono font-bold uppercase text-[#64748B]">
                      <span>Resource Group</span>
                      <span>Current → Target</span>
                    </div>
                    <div className="space-y-1 font-admin-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#16A34A] font-semibold">Protected Admin Auth</span>
                        <span className="font-bold text-[#16A34A]">
                          {plan.currentCounts.protectedAuth} → {plan.targetCounts.protectedAuth} (Preserved)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7C3AED]">Canonical Static Pillars</span>
                        <span className="font-bold text-black">
                          {plan.currentCounts.staticCanonical} → {plan.targetCounts.staticCanonical} docs
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#DC2626]">Dynamic Records</span>
                        <span className="font-bold text-black">
                          {plan.currentCounts.dynamic} → {plan.targetCounts.dynamic} records
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Redis & RTDB Cache</span>
                        <span className="font-bold text-black">
                          {plan.currentCounts.redisKeys} keys → {plan.targetCounts.redisKeys} keys
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acknowledgment Checkbox */}
                <label className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmUnderstood}
                    onChange={(e) => setConfirmUnderstood(e.target.checked)}
                    className="mt-0.5 rounded-xs text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-xs font-admin-sans text-[#334155] leading-relaxed">
                    I understand this will execute <span className="font-bold uppercase">{activeModal}</span> according to the preflight plan while keeping admin authentication 100% protected.
                  </span>
                </label>

                {/* Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isPending || isRequestingOtp}
                    className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={!confirmUnderstood || isRequestingOtp}
                    className={`px-4 py-2 text-xs font-admin-sans font-semibold text-white rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                      activeModal === "CLEAN" || activeModal === "RESET"
                        ? "bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C]"
                        : "bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9]"
                    }`}
                  >
                    {isRequestingOtp ? (
                      <>
                        <FaCircleNotch className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Passcode...</span>
                      </>
                    ) : (
                      <>
                        <FaShieldHalved className="w-3.5 h-3.5" />
                        <span>Request Security Passcode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: OTP VERIFICATION (SINGLE-VIEW NO-SCROLL) */}
            {modalStep === "OTP_VERIFY" && (
              <div className="space-y-4">
                {/* Notice */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-black font-admin-sans">
                    <FaEnvelope className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Passcode sent to {otpChallenge?.maskedEmail || "Superadmin Email"}</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-admin-sans">
                    Enter the 6-digit security authorization code to execute <strong>{activeModal}</strong>. Code is valid for {Math.floor(expiresCountdownSec / 60)}m {expiresCountdownSec % 60}s.
                  </p>
                </div>

                {/* 6 Individual Digit Inputs */}
                <div className="flex items-center justify-center gap-2.5 py-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      disabled={isExecuting}
                      className={`w-11 h-12 text-center text-lg font-bold font-admin-mono rounded-xs border transition-all text-black bg-white ${
                        digit
                          ? "border-[#2563EB] bg-[#EFF6FF]/20 text-[#2563EB] ring-1 ring-[#2563EB]"
                          : "border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      }`}
                    />
                  ))}
                </div>

                {/* Resend & Cooldown Info */}
                <div className="flex items-center justify-between text-xs font-admin-sans px-1">
                  <span className="text-[#64748B] text-[11px] font-admin-mono">
                    Attempts: {otpChallenge?.remainingAttempts ?? 3} remaining
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldownSec > 0 || isResendingOtp || isExecuting}
                    className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline disabled:text-[#94A3B8] disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <FaArrowRotateRight className={`w-3 h-3 ${isResendingOtp ? "animate-spin" : ""}`} />
                    {resendCooldownSec > 0
                      ? `Resend in ${resendCooldownSec}s`
                      : isResendingOtp
                      ? "Sending..."
                      : "Resend Passcode"}
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModalStep("PREFLIGHT")}
                    disabled={isExecuting}
                    className="text-xs font-admin-sans font-medium text-[#64748B] hover:text-black cursor-pointer"
                  >
                    ← Back to Preflight
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isExecuting}
                      className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyAndExecute}
                      disabled={!isOtpComplete || isExecuting}
                      className={`px-5 py-2 text-xs font-admin-sans font-semibold text-white rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                        activeModal === "CLEAN" || activeModal === "RESET"
                          ? "bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C]"
                          : "bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9]"
                      }`}
                    >
                      <FaKey className="w-3.5 h-3.5" />
                      <span>Authorize & Execute {activeModal}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. HISTORY RECEIPT DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedHistoryReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] w-full max-w-2xl rounded-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-black max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold font-admin-sans text-black">
                  Execution Receipt: {selectedHistoryReceipt.executionId}
                </h3>
                <span className="text-[10px] font-admin-mono text-[#64748B]">
                  {selectedHistoryReceipt.operation} • Status: {selectedHistoryReceipt.status} • Duration: {selectedHistoryReceipt.durationMs}ms
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryReceipt(null)}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 font-admin-sans text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#F8FAFC] p-3 border border-[#E2E8F0] rounded-xs font-admin-mono text-[11px]">
                <div>
                  <span className="text-[#64748B] block text-[10px]">ENVIRONMENT</span>
                  <span className="font-bold text-black">{selectedHistoryReceipt.environment}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">PROJECT ID</span>
                  <span className="font-bold text-black">{selectedHistoryReceipt.projectId}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">ACTOR</span>
                  <span className="font-bold text-black">{selectedHistoryReceipt.actor.actorRole}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">AUTH DRIFT</span>
                  <span className="font-bold text-[#16A34A]">
                    {selectedHistoryReceipt.authIntegrityVerification?.isMatch ? "0 BYTES" : "DRIFT"}
                  </span>
                </div>
              </div>

              {/* Stage Progression */}
              <div>
                <h5 className="text-[11px] font-admin-mono uppercase font-bold text-[#64748B] mb-2">
                  Executed Stages
                </h5>
                <div className="space-y-1.5 font-admin-mono text-[11px]">
                  {selectedHistoryReceipt.stageResults.map((stg) => (
                    <div
                      key={stg.stage}
                      className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black">{stg.stage}</span>
                        <span className="text-[#64748B]">{stg.details}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#64748B]">{stg.durationMs}ms</span>
                        <span
                          className={`px-1 py-0.5 rounded-xs text-[9px] font-bold ${
                            stg.status === "SUCCESS"
                              ? "bg-[#F0FDF4] text-[#16A34A]"
                              : "bg-[#FEF2F2] text-[#DC2626]"
                          }`}
                        >
                          {stg.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedHistoryReceipt(null)}
                className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
