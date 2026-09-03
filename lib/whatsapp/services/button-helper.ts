/**
 * Adaptive Button Generation Engine
 * 
 * Computes state-aware quick reply buttons based on recruiter's session history.
 * Consumed or completed options are suppressed so the recruiter only sees relevant, uncompleted actions.
 */

import type { WhatsAppThread } from "../types";

export interface AdaptiveButton {
  id: string;
  title: string;
}

/**
 * Returns 1 to 3 adaptive quick reply buttons tailored to the recruiter's conversation state.
 */
export function getAdaptiveButtons(thread: WhatsAppThread): AdaptiveButton[] {
  const buttons: AdaptiveButton[] = [];

  // 1. Resume Option: Show if not yet requested
  if (!thread.hasReceivedResume) {
    buttons.push({ id: "action_resume", title: "📄 Get Resume PDF" });
  }

  // 2. Opportunity Option: Show if not yet submitted
  if (!thread.leadSubmitted) {
    buttons.push({ id: "action_opportunity", title: "💼 Opportunity" });
  }

  // 3. Human Connection: Show if not yet requested
  if (!thread.hasRequestedHuman) {
    buttons.push({ id: "action_human", title: "🤝 Talk to Gaurav" });
  }

  // Fallback Guarantee: Meta Cloud API requires at least 1 and max 3 buttons.
  // If the recruiter has completed all actions, offer re-engagement options:
  if (buttons.length === 0) {
    buttons.push(
      { id: "action_resume", title: "📄 Re-send Resume" },
      { id: "action_opportunity", title: "💼 New Opportunity" },
      { id: "action_human", title: "🤝 Talk to Gaurav" }
    );
  }

  return buttons.slice(0, 3);
}
