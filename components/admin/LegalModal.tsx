"use client";

import React, { useState } from "react";
import { FaXmark, FaShieldHalved, FaScaleBalanced, FaLock, FaDatabase, FaClock, FaMobileScreenButton } from "react-icons/fa6";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "privacy";
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = "terms",
}) => {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 font-admin-sans">
      <div className="bg-white border border-[#E5E7EB] rounded-sm max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#F0F0F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-black text-white flex items-center justify-center shadow-xs">
              <FaShieldHalved className="w-3.5 h-3.5 text-[#A855F7]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-admin-mono tracking-widest text-[#737373] uppercase font-semibold">
                  LEGAL & SECURITY COMPLIANCE
                </span>
                <span className="text-[10px] font-admin-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-xs">
                  v4.1 ACTIVE • 3-FACTOR 2FA
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                Admin Subsystem Governance
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm bg-[#F5F5F5] hover:bg-black text-[#525252] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#F0F0F0] bg-[#FAFAFA] font-admin-mono text-xs">
          <button
            onClick={() => setActiveTab("terms")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "terms"
                ? "border-black text-black bg-white shadow-xs"
                : "border-transparent text-[#737373] hover:text-black"
            }`}
          >
            <FaScaleBalanced className="w-3.5 h-3.5" />
            <span>01. Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "privacy"
                ? "border-black text-black bg-white shadow-xs"
                : "border-transparent text-[#737373] hover:text-black"
            }`}
          >
            <FaLock className="w-3.5 h-3.5" />
            <span>02. Privacy & Data Policy</span>
          </button>
        </div>

        {/* Scrollable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-[13px] text-[#374151] leading-relaxed">
          {activeTab === "terms" ? (
            <div className="space-y-6">
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[11px] font-admin-mono text-[#475569]">
                LAST REVISED: AUGUST 2026 &bull; APPLIES TO /admin/* &bull; MANDATORY 3-LAYER MFA
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
                  1. Authorized Administrative Identity
                </h3>
                <p>
                  Access to this administrative portal is restricted exclusively to authorized Devlabs administrators. Authentication requires verified Google OAuth credentials matching <code className="bg-[#F5F5F5] px-1 py-0.5 rounded-xs font-admin-mono text-black font-semibold">gauravpatil9262@gmail.com</code> combined with second-factor dynamic email OTP and third-factor Google Authenticator (TOTP) verification.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaMobileScreenButton className="w-3.5 h-3.5 text-[#A855F7]" />
                  2. Mandatory 3-Factor Multi-Layer Architecture
                </h3>
                <p>
                  Sign-in requires a sequential 3-layer security handshake:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[#525252]">
                  <li><strong>Layer 1: Google OAuth Identity</strong> verified against authorized administrator account.</li>
                  <li><strong>Layer 2: Email Security OTP</strong> dispatched via TLS 1.3 gateway with a 5-minute TTL.</li>
                  <li><strong>Layer 3: Google Authenticator (RFC 6238 TOTP)</strong> registered under app title <em>&quot;Gaurav Portfolio Admin Panel&quot;</em>.</li>
                </ol>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaClock className="w-3.5 h-3.5 text-[#A855F7]" />
                  3. Attempt Throttling, Lockout & Session Lifetimes
                </h3>
                <p>
                  A strict 5-attempt security threshold applies to both Email OTP and Google Authenticator verification. Exceeding 5 failed attempts triggers an automatic 5-minute cryptographic lockout. Authorized sessions maintain an 8-hour maximum lifetime and a 2-hour background inactivity timeout.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
                  4. Destructive Database Operations (Nuclear Purge)
                </h3>
                <p>
                  The Database Services console contains nuclear data purge utilities executed via Firebase Admin SDK Service Account credentials. The administrator acknowledges that executing a nuclear database wipe permanently removes Realtime Database document nodes and flushes Upstash Redis cache storage.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[11px] font-admin-mono text-[#475569]">
                DATA GOVERNANCE PROTOCOL &bull; ZERO-API-KEY TOTP ENCRYPTION
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaDatabase className="w-3.5 h-3.5 text-[#A855F7]" />
                  1. Information We Collect & Process
                </h3>
                <p>
                  The admin panel processes minimal administrative data strictly necessary for security and content management:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#525252]">
                  <li>Google Account profile metadata (Email, Display Name, Avatar URL).</li>
                  <li>One-Time Password (OTP) delivery targets and 5-minute cryptographic verification hashes.</li>
                  <li>Google Authenticator Base32 cryptographic secret keys stored securely in Upstash Redis.</li>
                  <li>Inquiry contact messages, email subscribers, and showcase portfolio articles.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaShieldHalved className="w-3.5 h-3.5 text-[#A855F7]" />
                  2. Google Authenticator (TOTP) Security Standards
                </h3>
                <p>
                  TOTP codes are generated and verified locally using the mathematical RFC 6238 standard with zero third-party API keys. Secret keys are transmitted solely during QR Code generation over encrypted HTTPS connections.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaClock className="w-3.5 h-3.5 text-[#A855F7]" />
                  3. Cookie & Session Governance
                </h3>
                <p>
                  We utilize secure HTTP cookies (<code className="bg-[#F5F5F5] px-1 py-0.5 rounded-xs font-admin-mono text-black font-semibold">devlabs_admin_session</code>) scoped with <code className="bg-[#F5F5F5] px-1 py-0.5 rounded-xs font-admin-mono text-black">SameSite=Lax</code> and 8-hour expiry timestamps. No commercial trackers, third-party analytics pixels, or advertising identifiers are deployed.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <FaLock className="w-3.5 h-3.5 text-[#A855F7]" />
                  4. Right to Complete Deletion (Zero Retention)
                </h3>
                <p>
                  In accordance with zero-retention standards, all messages, subscribers, and cache keys can be wiped to exactly 0 instantaneously using the Database Services module.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
          <span className="text-[11px] font-admin-mono text-[#737373]">
            Devlabs Security Subsystem &bull; 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black hover:bg-[#262626] text-white text-xs font-admin-mono font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors shadow-xs"
          >
            I Understand &bull; Close
          </button>
        </div>
      </div>
    </div>
  );
};
