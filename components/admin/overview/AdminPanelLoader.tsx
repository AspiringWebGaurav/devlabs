"use client";

import React, { useState, useEffect } from "react";
import { FaShieldHalved } from "react-icons/fa6";

interface AdminPanelLoaderProps {
  onComplete?: () => void;
}

interface LoadingStage {
  progress: number;
  stage: string;
  detail: string;
}

const STAGES: LoadingStage[] = [
  {
    progress: 25,
    stage: "Verifying Authentication",
    detail: "Validating Superadmin session...",
  },
  {
    progress: 55,
    stage: "Connecting Data Layer",
    detail: "Mounting Real-Time Database & Telemetry...",
  },
  {
    progress: 85,
    stage: "Initializing Canvas",
    detail: "Rendering analytics modules & widgets...",
  },
  {
    progress: 100,
    stage: "Workspace Ready",
    detail: "Opening administrator dashboard...",
  },
];

export const AdminPanelLoader: React.FC<AdminPanelLoaderProps> = ({ onComplete }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Step 1: Advance to Stage 2 (55%)
    const t1 = setTimeout(() => {
      setCurrentStageIdx(1);
      setProgress(55);
    }, 120);

    // Step 2: Advance to Stage 3 (85%)
    const t2 = setTimeout(() => {
      setCurrentStageIdx(2);
      setProgress(85);
    }, 280);

    // Step 3: Advance to Stage 4 (100%)
    const t3 = setTimeout(() => {
      setCurrentStageIdx(3);
      setProgress(100);
    }, 420);

    // Step 4: Completion trigger
    const t4 = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 560);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  const current = STAGES[currentStageIdx];

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-[2px] shadow-2xs space-y-5 animate-in fade-in duration-200">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span className="font-admin-sans text-lg font-extrabold tracking-tight text-black">
              admin panel<span className="text-[#7C3AED]">.</span>
            </span>
          </div>
          <span className="font-admin-mono text-[9px] uppercase tracking-widest text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 rounded-2xs font-bold">
            {progress}%
          </span>
        </div>

        {/* Dynamic Stage Message */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <FaShieldHalved className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div className="min-w-0">
            <h4 className="font-admin-sans font-bold text-xs text-black truncate transition-all duration-150">
              {current.stage}
            </h4>
            <p className="font-admin-mono text-[10px] text-[#64748B] mt-0.5 truncate transition-all duration-150">
              {current.detail}
            </p>
          </div>
        </div>

        {/* Real Dynamic Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#000000] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer subtle text */}
        <div className="flex items-center justify-between text-[10px] font-admin-mono text-[#94A3B8] pt-1">
          <span>SUPERADMIN SECURE</span>
          <span className="text-[#10B981] font-semibold tracking-wider">
            {progress === 100 ? "READY" : "CONNECTING"}
          </span>
        </div>
      </div>
    </div>
  );
};
