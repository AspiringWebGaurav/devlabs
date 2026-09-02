/**
 * WhatsApp Multi-Store Repository (4-Tier DAL Architecture)
 * 
 * Strict separation: UI -> WhatsAppRepository -> DataSources -> Infrastructure.
 * Uses Firestore for authoritative persistence and RTDB for real-time live synchronization.
 */

import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { rtdbDataSource } from "@/lib/dal/datasource/rtdb";
import { adminLogger } from "@/lib/admin/logger";
import { normalizeE164 } from "../security/sanitizer";
import type {
  WhatsAppThread,
  WhatsAppMessage,
  WhatsAppOpportunityLead,
  WhatsAppSyncSignal,
} from "../types";

const THREADS_COLLECTION = "whatsapp_threads";
const MESSAGES_COLLECTION = "whatsapp_messages";
const LEADS_COLLECTION = "whatsapp_leads";
const RTDB_SIGNALS_ROOT = "whatsapp_signals/thread_updates";

export class WhatsAppRepository {
  /**
   * Retrieves a conversation thread by normalized recruiter phone.
   */
  public async getThread(phone: string): Promise<WhatsAppThread | null> {
    const threadId = normalizeE164(phone);
    return await firestoreDataSource.getDocument<WhatsAppThread>(THREADS_COLLECTION, threadId);
  }

  /**
   * Saves or updates a conversation thread and updates unread status.
   */
  public async saveThread(thread: WhatsAppThread): Promise<void> {
    const threadId = normalizeE164(thread.id || thread.recruiterPhone);
    const sanitizedThread: WhatsAppThread = {
      ...thread,
      id: threadId,
      recruiterPhone: threadId,
      updatedAt: Date.now(),
    };

    await firestoreDataSource.setDocument(THREADS_COLLECTION, threadId, sanitizedThread, true);
  }

  /**
   * Lists all recruiter threads sorted by last activity timestamp.
   */
  public async listThreads(): Promise<WhatsAppThread[]> {
    return await firestoreDataSource.getAllDocuments<WhatsAppThread>(
      THREADS_COLLECTION,
      "lastInboundMessageAt",
      "desc"
    );
  }

  /**
   * Persists an individual inbound or outbound message in the audit log.
   */
  public async saveMessage(message: WhatsAppMessage): Promise<void> {
    const threadId = normalizeE164(message.threadId);
    const docId = message.id; // Meta wamid

    const sanitizedMessage: WhatsAppMessage = {
      ...message,
      threadId,
    };

    await firestoreDataSource.setDocument(MESSAGES_COLLECTION, docId, sanitizedMessage, true);
  }

  /**
   * Lists all messages for a specific conversation thread in chronological order.
   */
  public async listMessages(phone: string): Promise<WhatsAppMessage[]> {
    const threadId = normalizeE164(phone);
    const result = await firestoreDataSource.queryCollection<WhatsAppMessage>(
      MESSAGES_COLLECTION,
      {
        whereConditions: [{ field: "threadId", operator: "==", value: threadId }],
        limit: 100,
        orderByField: "timestamp",
        orderDirection: "asc",
      }
    );
    return result.docs;
  }

  /**
   * Durably saves a completed recruiter opportunity lead.
   */
  public async saveOpportunityLead(lead: WhatsAppOpportunityLead): Promise<void> {
    const threadId = normalizeE164(lead.threadId || lead.recruiterPhone);
    const sanitizedLead: WhatsAppOpportunityLead = {
      ...lead,
      threadId,
    };

    await firestoreDataSource.setDocument(LEADS_COLLECTION, lead.id, sanitizedLead, true);
  }

  /**
   * Lists all captured opportunity leads sorted by creation time.
   */
  public async listOpportunityLeads(): Promise<WhatsAppOpportunityLead[]> {
    return await firestoreDataSource.getAllDocuments<WhatsAppOpportunityLead>(
      LEADS_COLLECTION,
      "createdAt",
      "desc"
    );
  }

  /**
   * Dispatches a minimal RTDB signal to notify the Admin panel of an update
   * without exposing message contents, PII, or document URLs.
   */
  public async broadcastSignal(signal: WhatsAppSyncSignal): Promise<void> {
    try {
      const cleanThreadKey = signal.threadId.replace(/[^0-9]/g, "");
      const path = `${RTDB_SIGNALS_ROOT}/${cleanThreadKey}`;
      await rtdbDataSource.setValue(path, signal);
    } catch (err) {
      adminLogger.warn("WhatsApp:RtdbSignalFailed", "Failed to broadcast RTDB signal, continuing safely", {
        error: String(err),
      });
    }
  }
}

export const whatsappRepository = new WhatsAppRepository();
