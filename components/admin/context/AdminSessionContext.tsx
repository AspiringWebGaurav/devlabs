"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { AdminSession, AdminUser } from "@/types/admin";
import { clearClientAdminSession } from "@/lib/admin/auth";
import { getFirebaseAuth } from "@/lib/admin/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

export interface AdminSessionContextValue {
  user: AdminUser | null;
  role: string;
  expiresAt: number;
  isAuthenticated: boolean;
  isExpiringSoon: boolean;
  signOut: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export interface AdminSessionProviderProps {
  children: React.ReactNode;
  initialSession: AdminSession | null;
}

export const AdminSessionProvider: React.FC<AdminSessionProviderProps> = ({
  children,
  initialSession,
}) => {
  const [session, setSession] = useState<AdminSession | null>(initialSession);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  // Sync state if server session prop changes
  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession]);

  // Check expiration status periodically
  useEffect(() => {
    if (!session?.expiresAt) return;

    const checkExpiration = () => {
      const remainingMs = session.expiresAt - Date.now();
      // Warning if less than 15 minutes remain
      setIsExpiringSoon(remainingMs > 0 && remainingMs <= 15 * 60 * 1000);

      if (remainingMs <= 0) {
        // Automatic client-side detachment upon expiry
        clearClientAdminSession();
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login?signedOut=true";
        }
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const signOut = useCallback(async () => {
    try {
      // 1. Clear Client Cookie & Local Storage Synchronously
      clearClientAdminSession();
      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
      }

      // 2. Server Session Deletion (Fire-and-forget / non-blocking)
      fetch("/api/admin/auth/session", {
        method: "DELETE",
        keepalive: true,
      }).catch(() => null);

      // 3. Firebase Auth SDK SignOut (Non-blocking / background)
      try {
        const auth = getFirebaseAuth();
        firebaseSignOut(auth).catch(() => {});
      } catch {
        // SDK detached
      }

      // 4. In-Tab Direct Navigation to Login
      if (typeof window !== "undefined") {
        window.location.replace("/admin/login?signedOut=true");
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.replace("/admin/login?signedOut=true");
      }
    }
  }, []);

  const value = useMemo<AdminSessionContextValue>(() => {
    const user: AdminUser | null = session
      ? {
          id: session.id,
          email: session.email,
          name: session.name,
          role: session.role,
          avatar: session.avatar,
        }
      : null;

    return {
      user,
      role: session?.role || "guest",
      expiresAt: session?.expiresAt || 0,
      isAuthenticated: Boolean(session && (!session.expiresAt || Date.now() < session.expiresAt)),
      isExpiringSoon,
      signOut,
    };
  }, [session, isExpiringSoon, signOut]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
};

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }
  return context;
}
