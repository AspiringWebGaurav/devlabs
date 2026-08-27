"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseRtdb, getFirebaseFirestore } from "@/lib/admin/firebase";
import { ref, onValue, off, Unsubscribe as RtdbUnsubscribe } from "firebase/database";
import { doc, onSnapshot, Unsubscribe as FirestoreUnsubscribe } from "firebase/firestore";

interface SyncSignalPayload {
  domain?: string;
  version?: number;
  timestamp?: number;
}

/**
 * Invisible client-side synchronization engine for the public portfolio.
 * Listens to safe public change signals from Firebase RTDB / Firestore / BroadcastChannel,
 * coalesces rapid changes, and triggers seamless Server Component revalidation via router.refresh().
 */
export function LivePortfolioSync() {
  const router = useRouter();
  const lastSyncTimestampRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    let rtdbUnsub: (() => void) | null = null;
    let firestoreUnsub: FirestoreUnsubscribe | null = null;
    let broadcastChannel: BroadcastChannel | null = null;

    const triggerRefresh = (signal: SyncSignalPayload) => {
      if (!isMounted) return;

      const signalTime = signal.timestamp || Date.now();
      // Ignore stale signals or initial mount payload
      if (signalTime <= lastSyncTimestampRef.current) return;
      lastSyncTimestampRef.current = signalTime;

      // Coalesce rapid mutations within 250ms window
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        try {
          router.refresh();
        } catch {
          // Fallback if router is navigating
        }
      }, 250);
    };

    // 1. Cross-Tab Synchronization via BroadcastChannel
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("portfolio_cms_sync");
        broadcastChannel.onmessage = (event: MessageEvent<SyncSignalPayload>) => {
          if (event.data && typeof event.data === "object") {
            triggerRefresh(event.data);
          }
        };
      }
    } catch {}

    // 2. Firebase RTDB Realtime Listener (Primary Low-Latency Push)
    try {
      const rtdb = getFirebaseRtdb();
      if (rtdb) {
        const syncRef = ref(rtdb, "public_signals/cms_sync");
        const unsubscribe = onValue(
          syncRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val() as SyncSignalPayload;
              triggerRefresh(data);
            }
          },
          () => {
            // RTDB permission / connection fallback handled by Firestore listener
          }
        );

        rtdbUnsub = () => {
          try {
            off(syncRef);
            if (typeof unsubscribe === "function") (unsubscribe as RtdbUnsubscribe)();
          } catch {}
        };
      }
    } catch {}

    // 3. Firebase Firestore onSnapshot Fallback Listener
    try {
      const firestore = getFirebaseFirestore();
      if (firestore) {
        const signalDocRef = doc(firestore, "portfolio_signal", "sync");
        firestoreUnsub = onSnapshot(
          signalDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as SyncSignalPayload;
              triggerRefresh(data);
            }
          },
          () => {
            // Firestore onSnapshot fallback error suppressed
          }
        );
      }
    } catch {}

    // 4. Reconnection & Visibility Resync Handler
    const handleReconnection = () => {
      triggerRefresh({ timestamp: Date.now() });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Quick coalesced refresh on tab refocus after potential idle time
        triggerRefresh({ timestamp: Date.now() });
      }
    };

    window.addEventListener("online", handleReconnection);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }
      if (rtdbUnsub) {
        try {
          rtdbUnsub();
        } catch {}
      }
      if (firestoreUnsub) {
        try {
          firestoreUnsub();
        } catch {}
      }

      window.removeEventListener("online", handleReconnection);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
