/**
 * Realistic Synthetic Dummy Data Generator & Generalized Side-Effect Firewall
 * 
 * Generates realistic development and stress-testing datasets across inquiries,
 * live chat journeys, and mail records with ZERO external side effects (0 emails, 0 SMS, 0 webhooks).
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { rtdbDataSource } from "@/lib/dal/datasource/rtdb";
import { adminLogger } from "@/lib/admin/logger";
import type { InquiryItem, MailDocument, MailDraftDocument } from "@/lib/dal/repositories/types";
import type { LiveChatThreadDocument, LiveChatMessageDocument } from "@/lib/dal/repositories/live-chat.repository";

export type SeedDatasetPreset = "small" | "medium" | "large";
export type SeedMode = "deterministic" | "random";

export interface SeedOptions {
  preset: SeedDatasetPreset;
  mode: SeedMode;
  seedString?: string;
}

export interface SeedExecutionResult {
  seedRunId: string;
  preset: SeedDatasetPreset;
  mode: SeedMode;
  inquiriesCount: number;
  chatThreadsCount: number;
  chatMessagesCount: number;
  mailsCount: number;
  draftsCount: number;
  synchronizedLeadCounter: number;
  durationMs: number;
}

// Pseudo-Random Number Generator (Mulberry32) for reproducible deterministic seeding
function createPrng(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let a = h >>> 0;

  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Synthetic Persona Pools (RFC 2606 safe domains only)
const SYNTHETIC_NAMES = [
  "Aarav Sharma",
  "Sophia Lin",
  "Marcus Vance",
  "Elena Rostova",
  "Liam O'Connor",
  "Amara Okafor",
  "Julian Sterling",
  "Chloe Dupont",
  "Devon Takahashi",
  "Maya Patel",
  "Benjamin Hayes",
  "Zoe Al-Mansoor",
  "Carlos Mendez",
  "Hannah Lindqvist",
  "Vikram Malhotra",
  "Nadia Kowalski",
  "Oliver Wright",
  "Ananya Roy",
  "Lucas Silva",
  "Fatima Zahra",
];

const SYNTHETIC_ROLES = [
  "Founder & CEO",
  "VP of Engineering",
  "Product Lead",
  "CTO & Co-Founder",
  "Principal Architect",
  "Design Director",
  "Head of Growth",
  "Engineering Manager",
  "Senior Product Designer",
];

const SYNTHETIC_SUBJECTS = [
  "Fullstack Next.js App Architecture",
  "Interactive 3D Three.js Web Experience",
  "Enterprise Dashboard & Telemetry Redesign",
  "High-Performance Web App Migration",
  "Custom AI Assistant & LLM Integration",
  "Design System & UI Component Library",
  "Cloudflare Edge Security & Resilient Architecture",
];

const SYNTHETIC_MESSAGES = [
  "Hi Gaurav, we are impressed by your Three.js and Next.js portfolio work. We're launching a SaaS platform next quarter and would love to collaborate on frontend architecture and 3D interactions.",
  "Hello Gaurav! Our team is looking to revamp our enterprise web platform. Your work on bento grids and real-time syncing matches what we need. Could you share your availability for a kickoff discussion?",
  "Hi Gaurav, I saw your live portfolio and love the slick luxury aesthetics. We have an upcoming mobile and web project requiring modern UI animations. Looking forward to discussing the timeline and scope.",
  "Greetings Gaurav! We need a principal frontend consultant to optimize our Next.js App Router performance and build high-density analytics dashboards. Let's connect soon.",
];

/**
 * Generates synthetic development data and populates database models directly.
 */
export async function generateSyntheticDevelopmentData(options: SeedOptions): Promise<SeedExecutionResult> {
  const startTime = Date.now();
  const seedRunId = `SEED-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const isDeterministic = options.mode === "deterministic";
  const prng = isDeterministic ? createPrng(options.seedString || "portfolio-dev") : Math.random;

  const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(prng() * arr.length)];

  // Preset Size Ratios
  let targetInquiries = 5;
  let targetChats = 3;
  let targetMails = 5;
  let targetDrafts = 2;

  if (options.preset === "medium") {
    targetInquiries = 25;
    targetChats = 10;
    targetMails = 25;
    targetDrafts = 5;
  } else if (options.preset === "large") {
    targetInquiries = 100;
    targetChats = 40;
    targetMails = 100;
    targetDrafts = 15;
  }

  adminLogger.info("SeedGenerator:starting", "Generating synthetic dataset", {
    seedRunId,
    preset: options.preset,
    mode: options.mode,
    targetInquiries,
    targetChats,
    targetMails,
  });

  // -------------------------------------------------------------------------
  // 1. Seed Inquiries & Leads
  // -------------------------------------------------------------------------
  const inquiryDocs: InquiryItem[] = [];
  for (let i = 1; i <= targetInquiries; i++) {
    const name = getRandomItem(SYNTHETIC_NAMES);
    const emailName = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
    const email = `${emailName}@example.com`;
    const subject = getRandomItem(SYNTHETIC_SUBJECTS);
    const role = getRandomItem(SYNTHETIC_ROLES);
    const message = `[Role: ${role}] ${getRandomItem(SYNTHETIC_MESSAGES)}`;
    const leadNumber = i;
    const inquiryId = `inq_${seedRunId}_${String(i).padStart(3, "0")}`;
    const createdAt = new Date(Date.now() - (targetInquiries - i) * 3600000).toISOString();

    inquiryDocs.push({
      id: inquiryId,
      name,
      email,
      subject,
      message,
      leadNumber,
      createdAt,
      status: i % 3 === 0 ? "read" : i % 5 === 0 ? "archived" : "unread",
      repliedAt: i % 3 === 0 ? createdAt : undefined,
      requestId: `req_${seedRunId}_${i}`,
      durableStatus: "CONFIRMED",
      deliveries: {
        ownerNotification: { state: "SENT", dispatchedAt: createdAt },
        visitorAutoReply: { state: "SENT", dispatchedAt: createdAt },
      },
    });
  }

  // Batch insert inquiries in chunks of 100
  for (let i = 0; i < inquiryDocs.length; i += 100) {
    const chunk = inquiryDocs.slice(i, i + 100);
    await firestoreDataSource.executeBatch(
      chunk.map((doc) => ({
        type: "set",
        collection: "inquiries",
        id: doc.id,
        data: doc,
        merge: false,
      }))
    );
  }

  // -------------------------------------------------------------------------
  // 2. Seed Live Chat Threads & Messages
  // -------------------------------------------------------------------------
  const threadDocs: LiveChatThreadDocument[] = [];
  let totalMessagesCount = 0;

  for (let t = 1; t <= targetChats; t++) {
    const visitorName = getRandomItem(SYNTHETIC_NAMES);
    const visitorEmail = `${visitorName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.org`;
    const threadId = `thread_${seedRunId}_${String(t).padStart(3, "0")}`;
    const sessionId = `sess_${seedRunId}_${String(t).padStart(3, "0")}`;
    const createdAtTime = Date.now() - (targetChats - t) * 7200000;
    const createdAt = new Date(createdAtTime).toISOString();

    const messages: LiveChatMessageDocument[] = [
      {
        id: `msg_${threadId}_1`,
        threadId,
        sender: "visitor",
        senderName: visitorName,
        text: `Hi Gaurav, I am ${visitorName}. Are you available for Next.js consulting?`,
        createdAt: new Date(createdAtTime).toISOString(),
      },
      {
        id: `msg_${threadId}_2`,
        threadId,
        sender: "gaurav",
        senderName: "Gaurav Patil",
        text: `Hi ${visitorName.split(" ")[0]}! Thanks for reaching out. Yes, I'd be happy to discuss your requirements.`,
        createdAt: new Date(createdAtTime + 120000).toISOString(),
      },
      {
        id: `msg_${threadId}_3`,
        threadId,
        sender: "visitor",
        senderName: visitorName,
        text: `Great! Let me prepare the project brief and send it over.`,
        createdAt: new Date(createdAtTime + 300000).toISOString(),
      },
    ];
    totalMessagesCount += messages.length;

    const threadDoc: LiveChatThreadDocument = {
      id: threadId,
      visitorName,
      visitorEmail,
      visitorSessionId: sessionId,
      status: t % 2 === 0 ? "RESOLVED" : "REPLIED",
      isVisitorLocked: false,
      adminToken: crypto.randomBytes(16).toString("hex"),
      lastMessageSnippet: messages[messages.length - 1].text,
      lastMessageSender: "visitor",
      lastMessageAt: messages[messages.length - 1].createdAt,
      messages,
      createdAt,
      updatedAt: messages[messages.length - 1].createdAt,
    };

    threadDocs.push(threadDoc);
  }

  // Batch insert chat threads
  for (let i = 0; i < threadDocs.length; i += 100) {
    const chunk = threadDocs.slice(i, i + 100);
    await firestoreDataSource.executeBatch(
      chunk.map((doc) => ({
        type: "set",
        collection: "portfolio_live_chat_threads",
        id: doc.id,
        data: doc,
        merge: false,
      }))
    );
  }

  // -------------------------------------------------------------------------
  // 3. Seed Mail Center (Sent Mails & Drafts)
  // -------------------------------------------------------------------------
  const mailDocs: MailDocument[] = [];
  const draftDocs: MailDraftDocument[] = [];

  for (let m = 1; m <= targetMails; m++) {
    const recipientName = getRandomItem(SYNTHETIC_NAMES);
    const recipientEmail = `${recipientName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`;
    const mailId = `mail_${seedRunId}_${String(m).padStart(3, "0")}`;
    const createdAtTime = Date.now() - (targetMails - m) * 1800000;
    const createdAtIso = new Date(createdAtTime).toISOString();

    mailDocs.push({
      id: mailId,
      senderKey: "HELLO",
      senderEmail: "hello@gauravpatil.site",
      senderName: "Gaurav Patil",
      replyTo: "hello@gauravpatil.site",
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `Project Inquiry Response: ${getRandomItem(SYNTHETIC_SUBJECTS)}`,
      htmlBody: `<p>Hi ${recipientName.split(" ")[0]},</p><p>Thank you for reaching out regarding your project.</p>`,
      textBody: `Hi ${recipientName.split(" ")[0]},\n\nThank you for reaching out regarding your project.`,
      status: "SENT",
      sentByAdminEmail: "gauravpatil5737@gmail.com",
      createdAt: createdAtIso,
      sentAt: createdAtIso,
      updatedAt: createdAtTime,
      brevoMessageId: `<synthetic_${mailId}@brevo.local>`,
    });
  }

  for (let d = 1; d <= targetDrafts; d++) {
    const recipientName = getRandomItem(SYNTHETIC_NAMES);
    const draftId = `draft_${seedRunId}_${String(d).padStart(3, "0")}`;
    const createdAtTime = Date.now() - (targetDrafts - d) * 3600000;
    const createdAtIso = new Date(createdAtTime).toISOString();

    draftDocs.push({
      id: draftId,
      senderKey: "HELLO",
      to: [{ email: `${recipientName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`, name: recipientName }],
      subject: `Draft Proposal: ${getRandomItem(SYNTHETIC_SUBJECTS)}`,
      body: `Hi ${recipientName.split(" ")[0]},\n\nI have outlined our tentative roadmap below...`,
      savedByAdminEmail: "gauravpatil5737@gmail.com",
      createdAt: createdAtIso,
      updatedAt: createdAtIso,
      expiresAt: new Date(createdAtTime + 30 * 86400000).toISOString(),
    });
  }

  // Batch insert sent mails
  for (let i = 0; i < mailDocs.length; i += 100) {
    const chunk = mailDocs.slice(i, i + 100);
    await firestoreDataSource.executeBatch(
      chunk.map((doc) => ({
        type: "set",
        collection: "admin_mails",
        id: doc.id,
        data: doc,
        merge: false,
      }))
    );
  }

  // Batch insert drafts
  for (let i = 0; i < draftDocs.length; i += 100) {
    const chunk = draftDocs.slice(i, i + 100);
    await firestoreDataSource.executeBatch(
      chunk.map((doc) => ({
        type: "set",
        collection: "admin_mail_drafts",
        id: doc.id,
        data: doc,
        merge: false,
      }))
    );
  }

  // -------------------------------------------------------------------------
  // 4. Synchronize Multi-Store Monotonic Lead Counter
  // -------------------------------------------------------------------------
  const synchronizedLeadCounter = targetInquiries;

  // A. Upstash Redis atomic counter
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/set/counter:leads:global/${synchronizedLeadCounter}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: "no-store",
      });
    } catch (err) {
      adminLogger.warn("SeedGenerator:redisCounterSync", "Failed to sync Redis counter", { error: String(err) });
    }
  }

  // B. Firebase RTDB counter node
  try {
    await rtdbDataSource.setValue("stats/leadCount", synchronizedLeadCounter);
  } catch (err) {
    adminLogger.warn("SeedGenerator:rtdbCounterSync", "Failed to sync RTDB counter", { error: String(err) });
  }

  // C. Firestore counter document
  try {
    await firestoreDataSource.setDocument("counters", "leads", { count: synchronizedLeadCounter }, true);
  } catch (err) {
    adminLogger.warn("SeedGenerator:firestoreCounterSync", "Failed to sync Firestore counter", { error: String(err) });
  }

  const durationMs = Date.now() - startTime;
  adminLogger.info("SeedGenerator:completed", "Synthetic seeding completed successfully", {
    seedRunId,
    durationMs,
    inquiriesCount: inquiryDocs.length,
    chatThreadsCount: threadDocs.length,
    chatMessagesCount: totalMessagesCount,
    mailsCount: mailDocs.length,
    draftsCount: draftDocs.length,
    synchronizedLeadCounter,
  });

  return {
    seedRunId,
    preset: options.preset,
    mode: options.mode,
    inquiriesCount: inquiryDocs.length,
    chatThreadsCount: threadDocs.length,
    chatMessagesCount: totalMessagesCount,
    mailsCount: mailDocs.length,
    draftsCount: draftDocs.length,
    synchronizedLeadCounter,
    durationMs,
  };
}
