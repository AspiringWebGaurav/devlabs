"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";
import { AdminConfirmModal } from "@/components/admin/ui/AdminConfirmModal";

export type AdminConfirmVariant = "danger" | "warning" | "purple" | "info";

export interface AdminConfirmOptions {
  title: string;
  description: string;
  variant?: AdminConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissOnBackdrop?: boolean;
}

interface QueuedConfirmRequest {
  id: string;
  options: AdminConfirmOptions;
  resolve: (value: boolean) => void;
  triggerElement: HTMLElement | null;
  hasResolved: boolean;
}

export interface AdminConfirmContextType {
  confirm: (options: AdminConfirmOptions) => Promise<boolean>;
}

const AdminConfirmContext = createContext<AdminConfirmContextType | null>(null);

export const useAdminConfirm = (): AdminConfirmContextType["confirm"] => {
  const ctx = useContext(AdminConfirmContext);
  if (!ctx) {
    throw new Error("useAdminConfirm must be used within an AdminConfirmProvider");
  }
  return ctx.confirm;
};

export const AdminConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRequest, setActiveRequest] = useState<QueuedConfirmRequest | null>(null);
  const queueRef = useRef<QueuedConfirmRequest[]>([]);
  const activeRequestRef = useRef<QueuedConfirmRequest | null>(null);

  // Exact capture of original body styles for idempotent scroll-lock restoration
  const originalStylesRef = useRef<{
    overflow: string;
    paddingRight: string;
  } | null>(null);

  const pathname = usePathname();

  // Scroll lock: capture existing styles & compensate for scrollbar width
  const lockScroll = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (originalStylesRef.current !== null) return; // Already locked

    originalStylesRef.current = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
  }, []);

  // Scroll unlock: restore exact previous body styles idempotently
  const unlockScroll = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (originalStylesRef.current === null) return; // Not locked

    document.body.style.overflow = originalStylesRef.current.overflow;
    document.body.style.paddingRight = originalStylesRef.current.paddingRight;
    originalStylesRef.current = null;
  }, []);

  // Focus restoration with safe fallback for removed/unmounted DOM elements
  const restoreFocus = useCallback((element: HTMLElement | null) => {
    if (!element || typeof document === "undefined") return;
    try {
      if (document.body.contains(element) && typeof element.focus === "function") {
        element.focus();
      }
    } catch {
      // Safe fallback - element detached or unmounted
    }
  }, []);

  // Process next item in FIFO queue
  const processNextInQueue = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      activeRequestRef.current = next;
      setActiveRequest(next);
      lockScroll();
    } else {
      activeRequestRef.current = null;
      setActiveRequest(null);
      unlockScroll();
    }
  }, [lockScroll, unlockScroll]);

  // Authoritative Exactly-Once Resolver
  const resolveActiveRequest = useCallback(
    (decision: boolean) => {
      const current = activeRequestRef.current;
      if (!current) return;

      // Completion Guard: Must resolve strictly once
      if (current.hasResolved) return;
      current.hasResolved = true;

      // Resolve the caller's Promise
      try {
        current.resolve(decision);
      } catch (err) {
        console.error("AdminConfirmProvider: resolver error", err);
      }

      const trigger = current.triggerElement;
      activeRequestRef.current = null;
      setActiveRequest(null);

      // Safe trigger focus restoration
      restoreFocus(trigger);

      // Advance FIFO queue or release scroll lock
      processNextInQueue();
    },
    [processNextInQueue, restoreFocus]
  );

  // Drain all active and queued requests safely with false
  const drainAllSafely = useCallback(() => {
    // 1. Drain active request
    if (activeRequestRef.current && !activeRequestRef.current.hasResolved) {
      activeRequestRef.current.hasResolved = true;
      try {
        activeRequestRef.current.resolve(false);
      } catch {}
      restoreFocus(activeRequestRef.current.triggerElement);
    }
    activeRequestRef.current = null;
    setActiveRequest(null);

    // 2. Drain all queued requests
    while (queueRef.current.length > 0) {
      const req = queueRef.current.shift();
      if (req && !req.hasResolved) {
        req.hasResolved = true;
        try {
          req.resolve(false);
        } catch {}
      }
    }

    // 3. Unlock scroll
    unlockScroll();
  }, [restoreFocus, unlockScroll]);

  // Route navigation safety: close/drain confirmation if pathname changes
  const initialPathnameRef = useRef(pathname);
  useEffect(() => {
    if (initialPathnameRef.current !== pathname) {
      initialPathnameRef.current = pathname;
      drainAllSafely();
    }
  }, [pathname, drainAllSafely]);

  // Browser Back/Forward navigation safety
  useEffect(() => {
    const handlePopState = () => {
      drainAllSafely();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      drainAllSafely();
    };
  }, [drainAllSafely]);

  // Provider unmount cleanup
  useEffect(() => {
    return () => {
      drainAllSafely();
    };
  }, [drainAllSafely]);

  // Public confirm() entry point
  const confirm = useCallback(
    (options: AdminConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const triggerElement =
          typeof document !== "undefined" && document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const request: QueuedConfirmRequest = {
          id: `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          options,
          resolve,
          triggerElement,
          hasResolved: false,
        };

        if (!activeRequestRef.current) {
          activeRequestRef.current = request;
          setActiveRequest(request);
          lockScroll();
        } else {
          queueRef.current.push(request);
        }
      });
    },
    [lockScroll]
  );

  return (
    <AdminConfirmContext.Provider value={{ confirm }}>
      {children}
      {activeRequest && (
        <AdminConfirmModal
          key={activeRequest.id}
          options={activeRequest.options}
          onConfirm={() => resolveActiveRequest(true)}
          onCancel={() => resolveActiveRequest(false)}
        />
      )}
    </AdminConfirmContext.Provider>
  );
};
