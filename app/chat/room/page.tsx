import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLiveChatRoom } from "@/components/chat/AdminLiveChatRoom";
import { CgSpinner } from "react-icons/cg";

export const metadata: Metadata = {
  title: "Live Chat Room | Gaurav Portfolio",
  description: "Direct authenticated live chat room for instant conversation with visitors.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-50 text-neutral-900 flex flex-col items-center justify-center p-4 font-sans">
          <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-neutral-200 shadow-xl">
            <CgSpinner className="w-8 h-8 animate-spin text-[#7C3AED]" />
            <p className="text-sm text-neutral-600 font-medium">Loading live chat room...</p>
          </div>
        </div>
      }
    >
      <AdminLiveChatRoom />
    </Suspense>
  );
}
