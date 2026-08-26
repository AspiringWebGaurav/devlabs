import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import { PRUNE_BATCH_LIMIT, RETENTION_BUFFER_MS } from "../constants";
import type { RepositoryResult } from "./types";
import type { Transaction } from "firebase-admin/firestore";

export type OtpVerificationStatus = "ACTIVE" | "VERIFIED" | "INVALIDATED" | "EXPIRED";

export interface AdminOtpChallengeRecord {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  otpHash: string;
  otpSalt: string;
  primaryOtpVerified?: boolean;
  attemptsCount: number;
  otpStatus: OtpVerificationStatus;
  isConsumed: boolean;
  consumedAt?: number;
  clientIp: string | null;
  userAgent?: string;
  ipVerified: boolean;
  resendCount: number;
  lastResentAt?: number;
  fallbackOtpHash?: string;
  fallbackOtpSalt?: string;
  fallbackResendCount?: number;
  fallbackLastResentAt?: number;
  createdAt: number;
  expiresAt: number;
}

export interface AdminTrustedIpRecord {
  id: string; // Deterministic: SHA-256(email + "_" + normalizedIp)
  email: string;
  ip: string;
  trustedAt: number;
  lastUsedAt: number;
  source: "first_login" | "email_approval" | "otp_fallback" | "manual";
  userAgent?: string;
}

export interface AdminIpVerificationRecord {
  id: string; // Deterministic: SHA-256(token)
  challengeId: string;
  email: string;
  ip: string;
  tokenHash: string;
  isConsumed: boolean;
  consumedAt?: number;
  attemptsCount: number;
  createdAt: number;
  expiresAt: number;
}

export class AuthChallengesRepository extends BaseRepository {
  private readonly challengesCollection = "admin_auth_challenges";
  private readonly trustedIpsCollection = "admin_trusted_ips";
  private readonly ipVerificationsCollection = "admin_ip_verifications";

  constructor() {
    super("AuthChallengesRepository");
  }

  // =========================================================================
  // 1. OTP Challenge Operations
  // =========================================================================

  public async createChallenge(
    challenge: AdminOtpChallengeRecord
  ): Promise<RepositoryResult<AdminOtpChallengeRecord>> {
    return this.executeQuery("createChallenge", async () => {
      await firestoreDataSource.setDocument(
        this.challengesCollection,
        challenge.id,
        challenge,
        false
      );
      return challenge;
    }, { challengeId: challenge.id, email: challenge.email });
  }

  public async getChallenge(
    challengeId: string
  ): Promise<RepositoryResult<AdminOtpChallengeRecord | null>> {
    return this.executeQuery("getChallenge", async () => {
      return await firestoreDataSource.getDocument<AdminOtpChallengeRecord>(
        this.challengesCollection,
        challengeId
      );
    }, { challengeId });
  }

  public async updateChallenge(
    challengeId: string,
    updates: Partial<AdminOtpChallengeRecord>
  ): Promise<RepositoryResult<void>> {
    return this.executeQuery("updateChallenge", async () => {
      await firestoreDataSource.setDocument(
        this.challengesCollection,
        challengeId,
        updates,
        true
      );
    }, { challengeId });
  }

  // =========================================================================
  // 2. Trusted IP Operations (Deterministic Canonical Key)
  // =========================================================================

  public async getTrustedIp(
    docId: string
  ): Promise<RepositoryResult<AdminTrustedIpRecord | null>> {
    return this.executeQuery("getTrustedIp", async () => {
      return await firestoreDataSource.getDocument<AdminTrustedIpRecord>(
        this.trustedIpsCollection,
        docId
      );
    }, { docId });
  }

  public async countTrustedIpsForEmail(
    email: string
  ): Promise<RepositoryResult<number>> {
    return this.executeQuery("countTrustedIpsForEmail", async () => {
      const result = await firestoreDataSource.queryCollection<AdminTrustedIpRecord>(
        this.trustedIpsCollection,
        {
          whereConditions: [{ field: "email", operator: "==", value: email.toLowerCase() }],
          limit: 10,
        }
      );
      return result.totalFetched;
    }, { email });
  }

  public async saveTrustedIp(
    trustedIp: AdminTrustedIpRecord
  ): Promise<RepositoryResult<void>> {
    return this.executeQuery("saveTrustedIp", async () => {
      await firestoreDataSource.setDocument(
        this.trustedIpsCollection,
        trustedIp.id,
        trustedIp,
        true
      );
    }, { docId: trustedIp.id, email: trustedIp.email, ip: trustedIp.ip });
  }

  // =========================================================================
  // 3. IP Verification Token Operations
  // =========================================================================

  public async createIpVerification(
    verification: AdminIpVerificationRecord
  ): Promise<RepositoryResult<AdminIpVerificationRecord>> {
    return this.executeQuery("createIpVerification", async () => {
      await firestoreDataSource.setDocument(
        this.ipVerificationsCollection,
        verification.id,
        verification,
        false
      );
      return verification;
    }, { verificationId: verification.id, email: verification.email });
  }

  public async getIpVerification(
    verificationId: string
  ): Promise<RepositoryResult<AdminIpVerificationRecord | null>> {
    return this.executeQuery("getIpVerification", async () => {
      return await firestoreDataSource.getDocument<AdminIpVerificationRecord>(
        this.ipVerificationsCollection,
        verificationId
      );
    }, { verificationId });
  }

  // =========================================================================
  // 4. Atomic Firestore Transaction Wrapper
  // =========================================================================

  public async runTransaction<T>(
    updateFunction: (
      transaction: Transaction,
      collections: {
        challenges: string;
        trustedIps: string;
        ipVerifications: string;
      },
      db: import("firebase-admin/firestore").Firestore
    ) => Promise<T>
  ): Promise<T> {
    return firestoreDataSource.runTransaction(async (transaction, db) => {
      return await updateFunction(
        transaction,
        {
          challenges: this.challengesCollection,
          trustedIps: this.trustedIpsCollection,
          ipVerifications: this.ipVerificationsCollection,
        },
        db
      );
    });
  }

  // =========================================================================
  // 5. Bounded Opportunistic Cleanup (Secondary to Auth, Limit 5)
  // =========================================================================

  /**
   * Cleans up expired/consumed challenge records for this email:
   * Criteria A: Expired beyond retention buffer (expiresAt < now - RETENTION_BUFFER_MS)
   * Criteria B: Consumed beyond retention buffer (isConsumed === true && consumedAt < now - RETENTION_BUFFER_MS)
   * Strictly bounded to PRUNE_BATCH_LIMIT (5). Non-blocking and never throws to caller.
   */
  public async pruneOldChallenges(email: string): Promise<number> {
    try {
      const now = Date.now();
      const cutoff = now - RETENTION_BUFFER_MS;
      let deletedCount = 0;

      // Query Criteria A (Expired past retention buffer using single-field automatic index)
      const expiredQuery = await firestoreDataSource.queryCollection<AdminOtpChallengeRecord>(
        this.challengesCollection,
        {
          whereConditions: [
            { field: "expiresAt", operator: "<", value: cutoff },
          ],
          limit: PRUNE_BATCH_LIMIT,
        }
      ).catch(() => ({ docs: [] }));

      const matchingExpired = email
        ? expiredQuery.docs.filter((d) => d.email?.toLowerCase() === email.toLowerCase())
        : expiredQuery.docs;

      for (const doc of matchingExpired) {
        await firestoreDataSource.deleteDocument(this.challengesCollection, doc.id).catch(() => {});
        deletedCount++;
      }

      // Query Criteria B (Clean up expired IP verification records using single-field automatic index)
      const ipVerifCutoff = now - RETENTION_BUFFER_MS;
      const expiredIpVerifQuery = await firestoreDataSource.queryCollection<{ id: string; email?: string }>(
        this.ipVerificationsCollection,
        {
          whereConditions: [
            { field: "expiresAt", operator: "<", value: ipVerifCutoff },
          ],
          limit: PRUNE_BATCH_LIMIT,
        }
      ).catch(() => ({ docs: [] }));

      const matchingIpVerifs = email
        ? expiredIpVerifQuery.docs.filter((d) => d.email?.toLowerCase() === email.toLowerCase())
        : expiredIpVerifQuery.docs;

      for (const doc of matchingIpVerifs) {
        await firestoreDataSource.deleteDocument(this.ipVerificationsCollection, doc.id).catch(() => {});
        deletedCount++;
      }

      return deletedCount;
    } catch {
      // Non-blocking: cleanup failure must NEVER fail authentication
      return 0;
    }
  }
}

export const authChallengesRepository = new AuthChallengesRepository();
