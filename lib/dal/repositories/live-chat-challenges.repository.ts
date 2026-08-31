import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import crypto from "crypto";

export type LiveChatChallengeStatus =
  | "PENDING"
  | "ACTIVE"
  | "VERIFIED"
  | "SUPERSEDED"
  | "LOCKED"
  | "EXPIRED"
  | "FAILED";

export interface LiveChatChallengeDocument {
  challengeId: string;
  email: string;
  name: string;
  otpHash: string;
  otpSalt: string;
  clientIp: string;
  userAgent?: string;
  status: LiveChatChallengeStatus;
  failedAttempts: number;
  maxAttempts: number;
  resendCount: number;
  maxResends: number;
  journeyId: string;
  createdAt: number;
  pendingExpiresAt: number;
  providerAcceptedAt?: number;
  activeAt?: number;
  expiresAt?: number;
  consumedAt?: number;
  visitorVerifiedAt?: number;
  dispatchDeduplicationKey: string;
}

export class LiveChatChallengesRepository extends BaseRepository {
  private static readonly COLLECTION_NAME = "live_chat_challenges";

  constructor() {
    super("LiveChatChallengesRepository");
  }

  /**
   * Persists a newly generated ephemeral OTP challenge.
   */
  public async createChallenge(doc: LiveChatChallengeDocument): Promise<void> {
    await this.executeMutation("createChallenge", async () => {
      await firestoreDataSource.setDocument(
        LiveChatChallengesRepository.COLLECTION_NAME,
        doc.challengeId,
        doc
      );
    });
  }

  /**
   * Retrieves a challenge document by its ID.
   */
  public async getChallenge(challengeId: string): Promise<LiveChatChallengeDocument | null> {
    const res = await this.executeQuery("getChallenge", async () => {
      return await firestoreDataSource.getDocument<LiveChatChallengeDocument>(
        LiveChatChallengesRepository.COLLECTION_NAME,
        challengeId
      );
    });
    return res.data;
  }

  /**
   * Finds the latest active or pending challenge for a given email address.
   */
  public async findActiveChallengeByEmail(
    normalizedEmail: string
  ): Promise<LiveChatChallengeDocument | null> {
    const res = await this.executeQuery("findActiveChallengeByEmail", async () => {
      const queryResult = await firestoreDataSource.queryCollection<LiveChatChallengeDocument>(
        LiveChatChallengesRepository.COLLECTION_NAME,
        {
          whereConditions: [
            { field: "email", operator: "==", value: normalizedEmail },
            { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
          ],
          limit: 1,
        }
      );
      return queryResult.docs[0] || null;
    });
    return res.data;
  }

  /**
   * Atomically supersedes all existing pending/active challenges for a journey/email.
   */
  public async supersedeExistingChallenges(normalizedEmail: string): Promise<void> {
    await this.executeMutation("supersedeExistingChallenges", async () => {
      const activeChallenges = await firestoreDataSource.queryCollection<LiveChatChallengeDocument>(
        LiveChatChallengesRepository.COLLECTION_NAME,
        {
          whereConditions: [
            { field: "email", operator: "==", value: normalizedEmail },
            { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
          ],
          limit: 10,
        }
      );

      if (activeChallenges.docs.length > 0) {
        const batchOps = activeChallenges.docs.map((doc) => ({
          type: "set" as const,
          collection: LiveChatChallengesRepository.COLLECTION_NAME,
          id: doc.challengeId,
          data: { status: "SUPERSEDED" },
          merge: true,
        }));
        await firestoreDataSource.executeBatch(batchOps);
      }
    });
  }

  /**
   * Atomically promotes a challenge from PENDING to ACTIVE (after Brevo SMTP gateway acceptance).
   */
  public async promotePendingToActive(challengeId: string): Promise<boolean> {
    const res = await this.executeMutation("promotePendingToActive", async () => {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection(LiveChatChallengesRepository.COLLECTION_NAME).doc(challengeId);
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) return false;
        const data = snapshot.data() as LiveChatChallengeDocument;
        const now = Date.now();

        // Late ACK validation: only promote if still PENDING and within pending TTL (15s)
        if (data.status !== "PENDING" || now > data.pendingExpiresAt) {
          return false;
        }

        const activeAt = now;
        const expiresAt = activeAt + 300 * 1000; // 5-minute active TTL begins

        transaction.update(docRef, {
          status: "ACTIVE",
          providerAcceptedAt: now,
          activeAt,
          expiresAt,
        });

        return true;
      });
    });
    return !!res.data;
  }

  /**
   * Atomically marks a challenge as FAILED (Brevo 4xx or gateway timeout).
   */
  public async markChallengeFailed(challengeId: string): Promise<void> {
    await this.executeMutation("markChallengeFailed", async () => {
      await firestoreDataSource.setDocument(
        LiveChatChallengesRepository.COLLECTION_NAME,
        challengeId,
        { status: "FAILED" },
        true
      );
    });
  }

  /**
   * Atomically verifies the submitted OTP verifier against stored hash.
   * Enforces single-use consumption, 3-attempt lockout, and 5-minute expiration.
   */
  public async verifyAndConsumeOtp(
    challengeId: string,
    computedVerifier: string
  ): Promise<{
    success: boolean;
    code?: string;
    remainingAttempts?: number;
    challenge?: LiveChatChallengeDocument;
  }> {
    const res = await this.executeMutation("verifyAndConsumeOtp", async () => {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection(LiveChatChallengesRepository.COLLECTION_NAME).doc(challengeId);
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) {
          return { success: false, code: "OTP_INVALID" };
        }

        const data = snapshot.data() as LiveChatChallengeDocument;
        const now = Date.now();

        // Check 1: Terminal status check
        if (data.status === "VERIFIED") {
          return { success: false, code: "OTP_SUPERSEDED" };
        }
        if (data.status === "SUPERSEDED") {
          return { success: false, code: "OTP_SUPERSEDED" };
        }
        if (data.status === "LOCKED") {
          return { success: false, code: "OTP_LOCKED", remainingAttempts: 0 };
        }
        if (data.status === "FAILED") {
          return { success: false, code: "OTP_EXPIRED" };
        }

        // Check 2: Challenge must be ACTIVE (confirmed by provider acceptance)
        if (data.status === "PENDING") {
          if (now > data.pendingExpiresAt) {
            transaction.update(docRef, { status: "EXPIRED" });
            return { success: false, code: "OTP_EXPIRED" };
          }
          return { success: false, code: "OTP_PENDING_DISPATCH" };
        }

        if (data.status !== "ACTIVE") {
          return { success: false, code: "OTP_EXPIRED" };
        }

        // Check 3: Expiration check (5m active TTL)
        if (data.expiresAt && now > data.expiresAt) {
          transaction.update(docRef, { status: "EXPIRED" });
          return { success: false, code: "OTP_EXPIRED" };
        }

        // Check 4: Lockout check
        if (data.failedAttempts >= data.maxAttempts) {
          transaction.update(docRef, { status: "LOCKED" });
          return { success: false, code: "OTP_LOCKED", remainingAttempts: 0 };
        }

        // Check 5: Constant-Time Verifier Comparison
        let isMatch = false;
        try {
          const storedBuf = Buffer.from(data.otpHash, "hex");
          const computedBuf = Buffer.from(computedVerifier, "hex");
          if (storedBuf.length === computedBuf.length) {
            isMatch = crypto.timingSafeEqual(storedBuf, computedBuf);
          }
        } catch {
          isMatch = false;
        }

        if (!isMatch) {
          const newFailedAttempts = (data.failedAttempts || 0) + 1;
          const remaining = Math.max(0, data.maxAttempts - newFailedAttempts);
          const newStatus = remaining === 0 ? "LOCKED" : "ACTIVE";

          transaction.update(docRef, {
            failedAttempts: newFailedAttempts,
            status: newStatus,
          });

          return {
            success: false,
            code: remaining === 0 ? "OTP_LOCKED" : "OTP_INVALID",
            remainingAttempts: remaining,
          };
        }

        // Check 6: Success & Atomic Consumption
        transaction.update(docRef, {
          status: "VERIFIED",
          consumedAt: now,
          visitorVerifiedAt: now,
        });

        return {
          success: true,
          challenge: data,
        };
      });
    });

    return res.data || { success: false, code: "INTERNAL_ERROR" };
  }

  /**
   * Purges ephemeral challenges older than the retention threshold (24 hours).
   */
  public async purgeExpiredChallenges(beforeTimestamp: number): Promise<number> {
    const res = await this.executeMutation("purgeExpiredChallenges", async () => {
      const candidates = await firestoreDataSource.queryCollection<LiveChatChallengeDocument>(
        LiveChatChallengesRepository.COLLECTION_NAME,
        {
          whereConditions: [
            { field: "createdAt", operator: "<=", value: beforeTimestamp },
          ],
          limit: 50,
        }
      );

      if (candidates.docs.length === 0) return 0;

      const batchOps = candidates.docs.map((doc) => ({
        type: "delete" as const,
        collection: LiveChatChallengesRepository.COLLECTION_NAME,
        id: doc.challengeId,
      }));

      await firestoreDataSource.executeBatch(batchOps);
      return candidates.docs.length;
    });

    return res.data || 0;
  }
}

export const liveChatChallengesRepository = new LiveChatChallengesRepository();
