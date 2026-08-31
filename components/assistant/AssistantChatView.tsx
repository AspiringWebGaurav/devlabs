"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  AssistantViewProps,
  LiveChatAuthState,
  LiveChatSessionData,
} from "./types";
import { LiveChatAuthForm } from "./auth/LiveChatAuthForm";
import { LiveChatOtpVerify } from "./auth/LiveChatOtpVerify";
import { LiveChatVerifiedComposer } from "./auth/LiveChatVerifiedComposer";
import { CgSpinner } from "react-icons/cg";

interface AssistantChatViewExtendedProps extends AssistantViewProps {
  onAuthStateChange?: (state: LiveChatAuthState) => void;
  onRegisterSignOut?: (signOutFn: () => void) => void;
}

export const AssistantChatView: React.FC<AssistantChatViewExtendedProps> = ({
  onBack,
  onAuthStateChange,
  onRegisterSignOut,
}) => {
  const [authState, setAuthState] = useState<LiveChatAuthState>("CHECKING");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [visitorEmail, setVisitorEmail] = useState<string>("");
  const [visitorName, setVisitorName] = useState<string>("");

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const onAuthStateChangeRef = useRef(onAuthStateChange);
  const onRegisterSignOutRef = useRef(onRegisterSignOut);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onAuthStateChangeRef.current = onAuthStateChange;
    onRegisterSignOutRef.current = onRegisterSignOut;
    onBackRef.current = onBack;
  });

  // Sync auth state to parent header
  useEffect(() => {
    onAuthStateChangeRef.current?.(authState);
  }, [authState]);

  // Sign out method
  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/assistant/auth/session", { method: "DELETE" });
      broadcastChannelRef.current?.postMessage({
        type: "SESSION_STATE_CHANGED",
        status: "UNAUTHENTICATED",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthState("UNAUTHENTICATED");
      setVisitorEmail("");
      setVisitorName("");
      setChallengeId(null);
      onBackRef.current?.();
    }
  }, []);

  // Register sign out handler with parent
  useEffect(() => {
    onRegisterSignOutRef.current?.(handleSignOut);
  }, [handleSignOut]);

  // 1. Initial Session Verification & BroadcastChannel listener
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/auth/session");
      const data = await res.json();

      if (res.ok && data.ok && data.authenticated && data.session) {
        setVisitorEmail(data.session.email);
        setVisitorName(data.session.name);
        setAuthState("AUTHENTICATED");
      } else {
        setAuthState("UNAUTHENTICATED");
      }
    } catch {
      setAuthState("UNAUTHENTICATED");
    }
  }, []);

  useEffect(() => {
    checkSession();

    // Multi-Tab synchronization using BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("live_chat_sync");
        broadcastChannelRef.current = bc;

        bc.onmessage = (event) => {
          if (event.data?.type === "SESSION_STATE_CHANGED") {
            if (event.data.status === "AUTHENTICATED") {
              checkSession();
            } else if (event.data.status === "UNAUTHENTICATED") {
              setAuthState("UNAUTHENTICATED");
              setVisitorEmail("");
              setVisitorName("");
            }
          }
        };

        return () => {
          bc.close();
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }, [checkSession]);

  // ---------------------------------------------------------------------------
  // View Rendering based on Auth State
  // ---------------------------------------------------------------------------

  if (authState === "CHECKING") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center p-6 select-none bg-white">
        <CgSpinner className="w-8 h-8 text-[#7C3AED] animate-spin" />
        <p className="text-xs text-neutral-500 font-medium">Verifying session...</p>
      </div>
    );
  }

  if (authState === "UNAUTHENTICATED") {
    return (
      <LiveChatAuthForm
        initialName={visitorName}
        initialEmail={visitorEmail}
        onOtpDispatched={(cId, name, email) => {
          setChallengeId(cId);
          setVisitorName(name);
          setVisitorEmail(email);
          setAuthState("OTP_SENT");
        }}
        onBack={onBack}
      />
    );
  }

  if (authState === "OTP_SENT" && challengeId) {
    return (
      <LiveChatOtpVerify
        challengeId={challengeId}
        email={visitorEmail}
        name={visitorName}
        onVerified={(session: LiveChatSessionData) => {
          setVisitorEmail(session.email);
          setVisitorName(session.name);
          setAuthState("AUTHENTICATED");
          broadcastChannelRef.current?.postMessage({
            type: "SESSION_STATE_CHANGED",
            status: "AUTHENTICATED",
          });
        }}
        onRestart={() => {
          setChallengeId(null);
          setAuthState("UNAUTHENTICATED");
        }}
      />
    );
  }

  return (
    <LiveChatVerifiedComposer
      name={visitorName}
      email={visitorEmail}
      onBack={onBack}
      onSignOut={handleSignOut}
    />
  );
};
