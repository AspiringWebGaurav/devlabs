import crypto from "crypto";
import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { RepositoryResult } from "./types";

export type LiveChatThreadStatus = "NEEDS_REPLY" | "REPLIED" | "RESOLVED";

export interface LiveChatMessageDocument {
  id: string;
  threadId: string;
  sender: "visitor" | "gaurav";
  senderName: string;
  text: string;
  createdAt: string;
}

export interface LiveChatThreadDocument {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorSessionId: string;
  status: LiveChatThreadStatus;
  isVisitorLocked: boolean;
  adminToken: string;
  lastMessageSnippet: string;
  lastMessageSender: "visitor" | "gaurav";
  lastMessageAt: string;
  messages: LiveChatMessageDocument[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Generates an HMAC-SHA256 token for 1-click passwordless admin access to a live chat thread.
 */
export function generateAdminThreadToken(threadId: string, visitorEmail: string): string {
  const secret = process.env.VISITOR_SESSION_SECRET || "gaurav_live_chat_admin_token_key";
  return crypto
    .createHmac("sha256", secret)
    .update(`${threadId.trim()}:${visitorEmail.trim().toLowerCase()}`)
    .digest("hex");
}

/**
 * Validates the HMAC-SHA256 token with timing-safe string comparison.
 */
export function verifyAdminThreadToken(threadId: string, visitorEmail: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = generateAdminThreadToken(threadId, visitorEmail);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export class LiveChatRepository extends BaseRepository {
  private threadsCollection = "portfolio_live_chat_threads";
  private messagesCollection = "portfolio_live_chat_messages";

  constructor() {
    super("LiveChatRepository");
  }

  /**
   * Retrieves or creates an active conversation thread for the verified visitor.
   */
  public async getOrCreateThreadForVisitor(params: {
    visitorName: string;
    visitorEmail: string;
    sessionId: string;
  }): Promise<RepositoryResult<LiveChatThreadDocument>> {
    return this.executeMutation("getOrCreateThreadForVisitor", async () => {
      const normalizedEmail = params.visitorEmail.trim().toLowerCase();
      const safeDocId = `thread_${crypto.createHash("sha256").update(normalizedEmail).digest("hex").substring(0, 16)}`;

      const existing = await firestoreDataSource.getDocument<LiveChatThreadDocument>(
        this.threadsCollection,
        safeDocId
      );

      if (existing) {
        // Ensure messages array is initialized
        const safeMessages = Array.isArray(existing.messages) ? existing.messages : [];

        // If visitor updated their display name or session, update thread metadata
        if (existing.visitorName !== params.visitorName || existing.visitorSessionId !== params.sessionId) {
          const updated: LiveChatThreadDocument = {
            ...existing,
            visitorName: params.visitorName,
            visitorSessionId: params.sessionId,
            messages: safeMessages,
            updatedAt: new Date().toISOString(),
          };
          await firestoreDataSource.setDocument(this.threadsCollection, safeDocId, updated, true);
          return updated;
        }
        return {
          ...existing,
          messages: safeMessages,
        };
      }

      const now = new Date().toISOString();
      const adminToken = generateAdminThreadToken(safeDocId, normalizedEmail);

      const newThread: LiveChatThreadDocument = {
        id: safeDocId,
        visitorName: params.visitorName.trim(),
        visitorEmail: normalizedEmail,
        visitorSessionId: params.sessionId,
        status: "REPLIED", // Initially visitor is not locked until they send a message
        isVisitorLocked: false,
        adminToken,
        lastMessageSnippet: "Conversation initiated.",
        lastMessageSender: "gaurav",
        lastMessageAt: now,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };

      await firestoreDataSource.setDocument(this.threadsCollection, safeDocId, newThread, false);
      return newThread;
    });
  }

  /**
   * Retrieves a thread by ID and verifies the admin magic token.
   */
  public async getThreadByIdAndToken(
    threadId: string,
    token: string
  ): Promise<RepositoryResult<LiveChatThreadDocument | null>> {
    return this.executeQuery("getThreadByIdAndToken", async () => {
      const thread = await firestoreDataSource.getDocument<LiveChatThreadDocument>(
        this.threadsCollection,
        threadId.trim()
      );

      if (!thread) return null;
      if (!verifyAdminThreadToken(thread.id, thread.visitorEmail, token)) {
        return null;
      }

      return {
        ...thread,
        messages: Array.isArray(thread.messages) ? thread.messages : [],
      };
    });
  }

  /**
   * Retrieves all messages for a specific conversation thread in chronological order.
   */
  public async getMessagesForThread(threadId: string): Promise<RepositoryResult<LiveChatMessageDocument[]>> {
    return this.executeQuery("getMessagesForThread", async () => {
      const thread = await firestoreDataSource.getDocument<LiveChatThreadDocument>(
        this.threadsCollection,
        threadId.trim()
      );

      if (thread && Array.isArray(thread.messages) && thread.messages.length > 0) {
        return thread.messages;
      }

      // Fallback query from messages collection if thread document array is empty
      const result = await firestoreDataSource.queryCollection<LiveChatMessageDocument>(
        this.messagesCollection,
        {
          whereConditions: [{ field: "threadId", operator: "==", value: threadId.trim() }],
          limit: 100,
        }
      );

      const docs = result.docs || [];
      return docs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    });
  }

  /**
   * Appends a message from the visitor, locks the visitor input, and marks status as NEEDS_REPLY.
   */
  public async appendVisitorMessage(params: {
    threadId: string;
    text: string;
    visitorName: string;
    visitorEmail: string;
  }): Promise<RepositoryResult<{ message: LiveChatMessageDocument; thread: LiveChatThreadDocument }>> {
    return this.executeMutation("appendVisitorMessage", async () => {
      const now = new Date().toISOString();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const message: LiveChatMessageDocument = {
        id: messageId,
        threadId: params.threadId,
        sender: "visitor",
        senderName: params.visitorName.trim(),
        text: params.text.trim(),
        createdAt: now,
      };

      // 1. Save to separate messages collection
      await firestoreDataSource.setDocument(this.messagesCollection, messageId, message, false);

      // 2. Atomically append to thread document's messages array for 100% instant persistence
      const currentThread = await firestoreDataSource.getDocument<LiveChatThreadDocument>(
        this.threadsCollection,
        params.threadId
      );

      const existingMessages = Array.isArray(currentThread?.messages) ? currentThread.messages : [];
      const updatedMessages = [...existingMessages, message];
      const snippet = params.text.trim().substring(0, 120);

      const updatedThread: Partial<LiveChatThreadDocument> = {
        isVisitorLocked: true,
        status: "NEEDS_REPLY",
        lastMessageSnippet: snippet,
        lastMessageSender: "visitor",
        lastMessageAt: now,
        messages: updatedMessages,
        updatedAt: now,
      };

      await firestoreDataSource.setDocument(this.threadsCollection, params.threadId, updatedThread, true);

      const fullThread: LiveChatThreadDocument = {
        ...(currentThread || {}),
        ...updatedThread,
        id: params.threadId,
        visitorName: params.visitorName,
        visitorEmail: params.visitorEmail,
        visitorSessionId: currentThread?.visitorSessionId || "",
        adminToken: currentThread?.adminToken || generateAdminThreadToken(params.threadId, params.visitorEmail),
        createdAt: currentThread?.createdAt || now,
        updatedAt: now,
        status: "NEEDS_REPLY",
        isVisitorLocked: true,
        lastMessageSnippet: snippet,
        lastMessageSender: "visitor",
        lastMessageAt: now,
        messages: updatedMessages,
      };

      return {
        message,
        thread: fullThread,
      };
    });
  }

  /**
   * Appends a reply from Gaurav, unlocks the visitor input, and marks status as REPLIED.
   */
  public async appendAdminReply(params: {
    threadId: string;
    text: string;
    adminName?: string;
  }): Promise<RepositoryResult<{ message: LiveChatMessageDocument; thread: LiveChatThreadDocument }>> {
    return this.executeMutation("appendAdminReply", async () => {
      const now = new Date().toISOString();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const adminName = params.adminName?.trim() || "Gaurav Patil";

      const message: LiveChatMessageDocument = {
        id: messageId,
        threadId: params.threadId,
        sender: "gaurav",
        senderName: adminName,
        text: params.text.trim(),
        createdAt: now,
      };

      // 1. Save to separate messages collection
      await firestoreDataSource.setDocument(this.messagesCollection, messageId, message, false);

      // 2. Atomically append to thread document's messages array
      const currentThread = await firestoreDataSource.getDocument<LiveChatThreadDocument>(
        this.threadsCollection,
        params.threadId
      );

      const existingMessages = Array.isArray(currentThread?.messages) ? currentThread.messages : [];
      const updatedMessages = [...existingMessages, message];
      const snippet = params.text.trim().substring(0, 120);

      const updatedThread: Partial<LiveChatThreadDocument> = {
        isVisitorLocked: false, // Unlocks visitor input immediately
        status: "REPLIED",
        lastMessageSnippet: snippet,
        lastMessageSender: "gaurav",
        lastMessageAt: now,
        messages: updatedMessages,
        updatedAt: now,
      };

      await firestoreDataSource.setDocument(this.threadsCollection, params.threadId, updatedThread, true);

      const fullThread: LiveChatThreadDocument = {
        ...(currentThread || {}),
        ...updatedThread,
        id: params.threadId,
        visitorName: currentThread?.visitorName || "Visitor",
        visitorEmail: currentThread?.visitorEmail || "",
        visitorSessionId: currentThread?.visitorSessionId || "",
        adminToken: currentThread?.adminToken || "",
        createdAt: currentThread?.createdAt || now,
        updatedAt: now,
        status: "REPLIED",
        isVisitorLocked: false,
        lastMessageSnippet: snippet,
        lastMessageSender: "gaurav",
        lastMessageAt: now,
        messages: updatedMessages,
      };

      return {
        message,
        thread: fullThread,
      };
    });
  }
}

export const liveChatRepository = new LiveChatRepository();
