"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import type { WhatsAppMessage, WhatsAppThread } from "@/lib/whatsapp/types";

export interface ReconcileOutboxInput {
  proofType: "META_WAMID_VERIFIED" | "META_GATEWAY_REJECTED" | "INCONCLUSIVE";
  metaMessageId?: string;
  rejectionReason?: string;
  auditNote?: string;
}

/**
 * Retrieves the messages for a thread (clean baseline: empty list).
 */
export async function getThreadMessagesAction(phone: string): Promise<WhatsAppMessage[]> {
  void phone;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");
  return [];
}

/**
 * Retrieves the live conversation list (clean baseline: empty list).
 */
export async function refreshThreadsAction(): Promise<WhatsAppThread[]> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");
  return [];
}

/**
 * Marks conversation as read.
 */
export async function markThreadReadAction(phone: string): Promise<void> {
  void phone;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");
}

/**
 * Reconciles outbox message (clean baseline).
 */
export async function reconcileOutboxMessageAction(
  operationId: string,
  evidence: ReconcileOutboxInput
): Promise<{ success: boolean; status?: string; error?: string }> {
  void operationId;
  void evidence;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");
  return { success: true };
}

/**
 * Retries failed outbox message (clean baseline).
 */
export async function retryFailedOutboxMessageAction(
  operationId: string
): Promise<{ success: boolean; error?: string }> {
  void operationId;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");
  return { success: true };
}
