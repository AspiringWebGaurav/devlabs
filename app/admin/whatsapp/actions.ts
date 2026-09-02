"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { whatsappRepository } from "@/lib/whatsapp/persistence/whatsapp.repository";
import type { WhatsAppMessage, WhatsAppThread } from "@/lib/whatsapp/types";

export async function getThreadMessagesAction(phone: string): Promise<WhatsAppMessage[]> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  return await whatsappRepository.listMessages(phone);
}

export async function refreshThreadsAction(): Promise<WhatsAppThread[]> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  return await whatsappRepository.listThreads();
}

export async function markThreadReadAction(phone: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  const thread = await whatsappRepository.getThread(phone);
  if (thread && thread.unreadByAdmin) {
    thread.unreadByAdmin = false;
    await whatsappRepository.saveThread(thread);
  }
}
