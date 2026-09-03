/**
 * Inbound Event Durable Persistence Repository
 * 
 * Strict Enterprise Invariant:
 * - Canonical Inbound Identity: Doc ID = sha256(wamid:wabaId:phoneNumber).
 * - Fast ACK gate: Webhook returns 200 if and only if raw inbound event is durably committed.
 * - Atomic Firestore Transaction Claim: Exactly one authorized worker processes any event.
 * - Invariant: MAX ACTIVE REQUEST DURATION (60s) < LEASE TTL (120s).
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";
import { normalizeE164 } from "../security/sanitizer";
import type { InboundEvent, InboundEventStatus } from "../types";

export const INBOUND_EVENTS_COLLECTION = "whatsapp_inbound_events";

export interface InboundClaimResult {
  shouldProcess: boolean;
  isDuplicate: boolean;
  eventId: string;
  httpStatus: 200 | 429 | 500;
  reason:
    | "NEW_EVENT_CLAIMED"
    | "RETRY_AFTER_FAILURE"
    | "LEASE_RECLAIMED_AFTER_CRASH"
    | "ALREADY_PROCESSED"
    | "IN_FLIGHT_CONCURRENT_SUPPRESSED"
    | "POISON_EVENT_SUPPRESSED"
    | "MAX_ATTEMPTS_EXCEEDED"
    | "CONFLICTING_PAYLOAD_REJECTED";
  attemptCount: number;
}

export class InboundEventRepository {
  /**
   * Computes deterministic canonical document ID for an inbound Meta message.
   */
  public computeEventId(wamid: string, wabaId: string, phoneNumber: string): string {
    const normalizedPhone = normalizeE164(phoneNumber);
    return crypto
      .createHash("sha256")
      .update(`${wamid}:${wabaId}:${normalizedPhone}`)
      .digest("hex");
  }

  /**
   * Atomically claims exclusive execution rights for an inbound event or detects duplicates.
   * Runs inside a single atomic Firestore transaction (OCC serializable).
   * Invariant: Lease duration (120s) > Max Vercel runtime execution (60s).
   */
  public async claimOrDetectDuplicate(
    event: InboundEvent,
    workerId: string,
    leaseDurationMs = 120000
  ): Promise<InboundClaimResult> {
    const docId = event.eventId || this.computeEventId(event.wamid, event.wabaId, event.phoneNumber);
    const now = Date.now();

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(INBOUND_EVENTS_COLLECTION).doc(docId);
      const snapshot = await tx.get(docRef);

      // Case 1: Brand new event -> Claim and grant exclusive execution rights
      if (!snapshot.exists) {
        const payload: InboundEvent = {
          ...event,
          eventId: docId,
          phoneNumber: normalizeE164(event.phoneNumber),
          receivedAt: event.receivedAt || now,
          processingStatus: "CLAIMED",
          lockedBy: workerId,
          leaseExpiresAt: now + leaseDurationMs,
          attemptCount: 1,
        };
        tx.set(docRef, payload);
        return {
          shouldProcess: true,
          isDuplicate: false,
          eventId: docId,
          httpStatus: 200,
          reason: "NEW_EVENT_CLAIMED",
          attemptCount: 1,
        };
      }

      const existing = snapshot.data() as InboundEvent;

      // Security Invariant: Conflicting Payload Immutability across ALL states
      // If a payload arrives with identical canonical identity (wamid:wabaId:phone)
      // but materially conflicting content, strictly reject mutation and execution!
      const isConflicting =
        (existing.body !== undefined && event.body !== undefined && existing.body !== event.body) ||
        (existing.type !== undefined && event.type !== undefined && existing.type !== event.type) ||
        (existing.mediaId !== undefined && event.mediaId !== undefined && existing.mediaId !== event.mediaId) ||
        (existing.interactiveButtonId !== undefined &&
          event.interactiveButtonId !== undefined &&
          existing.interactiveButtonId !== event.interactiveButtonId);

      if (isConflicting) {
        return {
          shouldProcess: false,
          isDuplicate: true,
          eventId: docId,
          httpStatus: 200,
          reason: "CONFLICTING_PAYLOAD_REJECTED",
          attemptCount: existing.attemptCount || 1,
        };
      }

      // Case 2: Terminal Success (PROCESSED)
      if (existing.processingStatus === "PROCESSED") {
        return {
          shouldProcess: false,
          isDuplicate: true,
          eventId: docId,
          httpStatus: 200,
          reason: "ALREADY_PROCESSED",
          attemptCount: existing.attemptCount || 1,
        };
      }

      // Case 3: Terminal Quarantine (POISON_EVENT / DEAD_LETTER)
      if (existing.processingStatus === "POISON_EVENT" || existing.processingStatus === "DEAD_LETTER") {
        return {
          shouldProcess: false,
          isDuplicate: true,
          eventId: docId,
          httpStatus: 200,
          reason: "POISON_EVENT_SUPPRESSED",
          attemptCount: existing.attemptCount || 1,
        };
      }

      // Case 4: Explicit Caught Failure (FAILED) -> Reclaim for retry if attempts < 3
      if (existing.processingStatus === "FAILED") {
        const currentAttempts = existing.attemptCount || 1;
        if (currentAttempts >= 3) {
          tx.update(docRef, {
            processingStatus: "POISON_EVENT",
            lastError: "Exceeded max attempt limit (3) following failure",
            lockedBy: null,
            leaseExpiresAt: null,
            updatedAt: now,
          });
          return {
            shouldProcess: false,
            isDuplicate: true,
            eventId: docId,
            httpStatus: 200,
            reason: "MAX_ATTEMPTS_EXCEEDED",
            attemptCount: currentAttempts,
          };
        }

        const nextAttempts = currentAttempts + 1;
        tx.update(docRef, {
          processingStatus: "CLAIMED",
          lockedBy: workerId,
          leaseExpiresAt: now + leaseDurationMs,
          attemptCount: nextAttempts,
          updatedAt: now,
        });

        return {
          shouldProcess: true,
          isDuplicate: false,
          eventId: docId,
          httpStatus: 200,
          reason: "RETRY_AFTER_FAILURE",
          attemptCount: nextAttempts,
        };
      }

      // Case 5: Active Claim in progress (CLAIMED and now < leaseExpiresAt)
      const isLeaseActive = existing.leaseExpiresAt && existing.leaseExpiresAt > now;
      if (isLeaseActive) {
        return {
          shouldProcess: false,
          isDuplicate: true,
          eventId: docId,
          httpStatus: 429,
          reason: "IN_FLIGHT_CONCURRENT_SUPPRESSED",
          attemptCount: existing.attemptCount || 1,
        };
      }

      // Case 6: Hard Crash Recovery (CLAIMED and now >= leaseExpiresAt)
      const currentAttempts = existing.attemptCount || 1;
      if (currentAttempts >= 3) {
        tx.update(docRef, {
          processingStatus: "POISON_EVENT",
          lastError: "Exceeded max attempt limit (3) without completing processing (crash timeout)",
          lockedBy: null,
          leaseExpiresAt: null,
          updatedAt: now,
        });
        return {
          shouldProcess: false,
          isDuplicate: true,
          eventId: docId,
          httpStatus: 200,
          reason: "MAX_ATTEMPTS_EXCEEDED",
          attemptCount: currentAttempts,
        };
      }

      const nextAttempts = currentAttempts + 1;
      tx.update(docRef, {
        processingStatus: "CLAIMED",
        lockedBy: workerId,
        leaseExpiresAt: now + leaseDurationMs,
        attemptCount: nextAttempts,
        updatedAt: now,
      });

      return {
        shouldProcess: true,
        isDuplicate: false,
        eventId: docId,
        httpStatus: 200,
        reason: "LEASE_RECLAIMED_AFTER_CRASH",
        attemptCount: nextAttempts,
      };
    });
  }


  /**
   * Atomically records a processing failure.
   * Returns true if event was permanently quarantined to POISON_EVENT, false if retryable.
   */
  public async recordFailure(eventId: string, error: string): Promise<boolean> {
    const now = Date.now();
    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(INBOUND_EVENTS_COLLECTION).doc(eventId);
      const snap = await tx.get(docRef);
      if (!snap.exists) return false;

      const data = snap.data() as InboundEvent;
      const attempts = data.attemptCount || 1;

      if (attempts >= 3) {
        tx.update(docRef, {
          processingStatus: "POISON_EVENT",
          lastError: error,
          lockedBy: null,
          leaseExpiresAt: null,
          updatedAt: now,
        });
        return true; // Terminal poison
      }

      tx.update(docRef, {
        processingStatus: "FAILED",
        lastError: error,
        lockedBy: null,
        leaseExpiresAt: null,
        updatedAt: now,
      });
      return false; // Retryable
    });
  }

  /**
   * Marks an inbound event as successfully processed.
   */
  public async markProcessed(eventId: string): Promise<void> {
    await firestoreDataSource.setDocument(
      INBOUND_EVENTS_COLLECTION,
      eventId,
      {
        processingStatus: "PROCESSED" as InboundEventStatus,
        processedAt: Date.now(),
        lockedBy: null,
        leaseExpiresAt: null,
      },
      true
    );
  }

  /**
   * Marks an inbound event as quarantined / poison after repeated crashes.
   */
  public async markPoison(eventId: string, error: string): Promise<void> {
    adminLogger.error("WhatsApp:InboundPoisonEvent", new Error(error), "Inbound event quarantined as poison", { eventId });
    await firestoreDataSource.setDocument(
      INBOUND_EVENTS_COLLECTION,
      eventId,
      {
        processingStatus: "POISON_EVENT" as InboundEventStatus,
        lastError: error,
        lockedBy: null,
        leaseExpiresAt: null,
      },
      true
    );
  }
}

export const inboundEventRepository = new InboundEventRepository();

