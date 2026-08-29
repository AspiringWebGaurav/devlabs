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

export interface AssistantBubbleProps {
  config?: AssistantConfig;
}

export interface AssistantWindowProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName?: string;
  avatarUrl?: string;
  onExitComplete?: () => void;
}

export interface AssistantHeaderProps {
  onClose: () => void;
  onBack?: () => void;
  currentView?: AssistantView;
  assistantName?: string;
  avatarUrl?: string;
}

export interface AssistantViewProps {
  onNavigate: (view: AssistantView) => void;
  onBack: () => void;
  assistantName?: string;
  avatarUrl?: string;
}

