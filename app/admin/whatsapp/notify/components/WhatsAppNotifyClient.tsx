"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  FaCheck,
  FaWhatsapp,
  FaEnvelope,
  FaRotate,
  FaXmark,
  FaArrowUpRightFromSquare,
  FaClock,
  FaUser,
  FaPaperPlane,
} from "react-icons/fa6";
import type { WhatsAppNotificationRecord } from "@/lib/dal/repositories/whatsapp-notifications.repository";
import { refreshNotificationHistoryAction } from "../actions";

interface WhatsAppNotifyClientProps {
  initialRecords: WhatsAppNotificationRecord[];
  recipientEmail: string;
  recipientName: string;
  recipientPhone: string;
  isAlreadySent: boolean;
  dispatchedAt: string;
}

export const WhatsAppNotifyClient: React.FC<WhatsAppNotifyClientProps> = ({
  initialRecords,
  recipientEmail,
  recipientName,
  recipientPhone,
  isAlreadySent,
  dispatchedAt,
}) => {
  const [records, setRecords] = useState<WhatsAppNotificationRecord[]>(initialRecords);
  const [isRefreshing, startRefresh] = useTransition();
  const [closeStatusText, setCloseStatusText] = useState<string | null>(null);

  const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
  const waChatUrl = `https://wa.me/${cleanPhone}`;

  const handleCloseWindow = () => {
    try {
      window.close();
      // If browser blocked window.close() (because script did not open it directly)
      setTimeout(() => {
        setCloseStatusText("You can now safely switch tabs or close this window.");
      }, 300);
    } catch {
      setCloseStatusText("You can now safely switch tabs or close this window.");
    }
  };

  const handleRefreshHistory = () => {
    startRefresh(async () => {
      const res = await refreshNotificationHistoryAction();
      if (res.success && res.records) {
        setRecords(res.records);
      }
    });
  };

  return (
    <div className="space-y-6 font-admin-sans">
      {/* 1. Main Confirmation Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <FaCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                  {isAlreadySent ? "Email Notification Confirmed" : "Email Notification Dispatched!"}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isAlreadySent ? "Recently Dispatched" : "Delivered via Brevo"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                An automated email was delivered to{" "}
                <span className="font-semibold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200 break-all">
                  {recipientEmail}
                </span>{" "}
                alerting <strong className="text-neutral-800">{recipientName}</strong> that you have replied on WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Key Delivery Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-5">
          <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <FaUser className="w-3 h-3 text-neutral-400" />
              <span>Recipient Name</span>
            </div>
            <div className="text-sm font-bold text-neutral-900 truncate">{recipientName}</div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <FaWhatsapp className="w-3 h-3 text-emerald-500" />
              <span>WhatsApp Number</span>
            </div>
            <a
              href={waChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5"
            >
              <span>+{cleanPhone}</span>
              <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <FaClock className="w-3 h-3 text-neutral-400" />
              <span>Dispatched At</span>
            </div>
            <div className="text-sm font-bold text-neutral-800 truncate">{dispatchedAt}</div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <FaEnvelope className="w-3 h-3 text-[#7C3AED]" />
              <span>Sender Identity</span>
            </div>
            <div className="text-sm font-bold text-[#7C3AED] truncate">hello@gauravpatil.online</div>
          </div>
        </div>

        {/* Action Buttons: Responsive row / column */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <a
            href={waChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
          >
            <FaWhatsapp className="w-4 h-4" />
            <span>Open Chat with {recipientName} on WhatsApp &rarr;</span>
          </a>

          <button
            type="button"
            onClick={handleCloseWindow}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-[#E2E8F0] text-neutral-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <FaXmark className="w-3.5 h-3.5" />
            <span>Close Window</span>
          </button>

          <Link
            href="/admin/whatsapp"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <span>WhatsApp Hub &rarr;</span>
          </Link>
        </div>

        {closeStatusText && (
          <div className="mt-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600 text-center font-medium">
            {closeStatusText}
          </div>
        )}
      </div>

      {/* 2. Dispatched Email History Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                Dispatched Email Notification History
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
                {records.length} {records.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live audit history of automated email notifications sent to visitors who reached out on WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshHistory}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-[#E2E8F0] text-xs font-semibold text-neutral-700 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-60"
          >
            <FaRotate className={`w-3 h-3 text-neutral-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh History"}</span>
          </button>
        </div>

        {/* History Records */}
        {records.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <FaPaperPlane className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm font-medium">No email notifications recorded yet.</p>
            <p className="text-xs text-neutral-400 mt-1">
              When you tap &quot;Send I&apos;ve Replied Email&quot; from WhatsApp inbound alerts, notifications will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (md and above) */}
            <div className="hidden md:block overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-neutral-500 font-semibold uppercase tracking-wider bg-[#FAFAFA]">
                    <th className="py-3 px-3">Sent At (IST)</th>
                    <th className="py-3 px-3">Recipient</th>
                    <th className="py-3 px-3">WhatsApp Number</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {records.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/75 transition-colors">
                      <td className="py-3 px-3 text-neutral-600 font-mono whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">{item.visitorName}</div>
                        <div className="text-neutral-500 text-[11px] break-all">{item.visitorEmail}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <a
                          href={`https://wa.me/${item.visitorPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                        >
                          <FaWhatsapp className="w-3 h-3 text-emerald-500" />
                          <span>+{item.visitorPhone}</span>
                        </a>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            item.status === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "DELIVERED" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {item.status === "DELIVERED" ? "Delivered via Brevo" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 max-w-xs truncate">
                        {item.subject}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Below md) */}
            <div className="md:hidden space-y-3 mt-4">
              {records.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-neutral-900 text-sm">{item.visitorName}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                        item.status === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === "DELIVERED" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {item.status === "DELIVERED" ? "Delivered" : "Failed"}
                    </span>
                  </div>

                  <div className="text-neutral-600 break-all font-mono text-[11.5px]">
                    {item.visitorEmail}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-neutral-500">
                    <a
                      href={`https://wa.me/${item.visitorPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline font-semibold flex items-center gap-1 text-[11.5px]"
                    >
                      <FaWhatsapp className="w-3 h-3 text-emerald-500" />
                      <span>+{item.visitorPhone}</span>
                    </a>
                    <span className="font-mono text-[10.5px]">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
