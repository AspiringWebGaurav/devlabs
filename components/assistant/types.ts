import type { AssistantDocument, AssistantPositionMode } from "@/types/portfolio";

export type { AssistantPositionMode };

export type AssistantView = "home" | "questions" | "chat";

export type AssistantLifecycleState =
  | "initializing"
  | "loading"
  | "ready"
  | "idle"
  | "opening"
  | "open"
  | "closing"
  | "disabled";

export type AssistantConfig = Partial<AssistantDocument>;

export type LiveChatAuthState =
  | "CHECKING"
  | "UNAUTHENTICATED"
  | "OTP_SENT"
  | "AUTHENTICATED";

export interface LiveChatSessionData {
  email: string;
  name: string;
  expiresAt: number;
}

export interface AssistantBubbleProps {
  config?: AssistantConfig;
}

export interface AssistantWindowProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName?: string;
  avatarUrl?: string;
  onExitComplete?: () => void;
  initialView?: AssistantView;
}

export interface AssistantHeaderProps {
  onClose: () => void;
  onBack?: () => void;
  currentView?: AssistantView;
  assistantName?: string;
  avatarUrl?: string;
  authState?: LiveChatAuthState;
  onSignOut?: () => void;
}

export interface AssistantViewProps {
  onNavigate: (view: AssistantView) => void;
  onBack: () => void;
  assistantName?: string;
  avatarUrl?: string;
}
