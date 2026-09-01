/**
 * Master Database Lifecycle Orchestrator & State Machine
 * 
 * Coordinates multi-store sanitation, fail-safe tokenized lock management,
 * SHA-256 protected-content integrity verification, system signal synchronization,
 * synthetic seeding, and structured execution receipt generation.
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { rtdbDataSource } from "@/lib/dal/datasource/rtdb";
import { redisDataSource, type RedisHealthInfo } from "@/lib/dal/datasource/redis";
import { adminLogger } from "@/lib/admin/logger";
import {
  LIFECYCLE_POLICY,
  classifyEntity,
  assertFailClosedClassification,
} from "./policy";
import {
  captureProtectedContentSnapshot,
  verifyProtectedSnapshots,
  type ProtectedSnapshot,
  type ProtectedIntegrityVerificationResult,
} from "./fingerprint";
import {
  acquireLifecycleLock,
  assertLockOwnership,
  releaseLifecycleLock,
} from "./lock";
import {
  generateSyntheticDevelopmentData,
  type SeedOptions,
  type SeedExecutionResult,
} from "./seed-generator";
import { emitCmsChangeSignal } from "@/lib/dal/repositories/live-sync.service";

export type LifecycleExecutionState =
  | "IDLE"
  | "AUDITING"
  | "SNAPSHOTTING"
  | "LOCK_ACQUIRED"
  | "PURGING_FIRESTORE"
  | "PURGING_RTDB"
  | "PURGING_REDIS"
  | "VERIFYING_CLEAN"
  | "VERIFYING_SNAPSHOT"
  | "SYSTEM_SIGNAL_SYNC"
  | "SEEDING_SYNTHETIC"
  | "VERIFYING_SEEDED"
  | "PARTIAL"
  | "CANCELLED"
  | "SUCCESS"
  | "FAILED";

export interface DatabaseAuditReport {
  auditId: string;
  auditFingerprint: string;
  timestamp: string;
  environment: string;
  projectId: string;
  isDestructiveAllowed: boolean;
  protectedFirestoreCollections: Array<{ name: string; count: number; description: string }>;
  protectedRtdbPaths: Array<{ path: string; description: string }>;
  dynamicFirestoreCollections: Array<{ name: string; count: number; description: string }>;
  dynamicRtdbPaths: Array<{ path: string; description: string }>;
  totalProtectedDocuments: number;
  totalDynamicDocuments: number;
  redisHealth: RedisHealthInfo;
  isFailClosedSafe: boolean;
  unclassifiedCollections: string[];
}

export interface LifecycleExecutionReceipt {
  executionId: string;
  auditId: string;
  snapshotId: string;
  operation: "DRY_RUN" | "PURGE_ONLY" | "RESET_AND_RESEED";
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "CANCELLED";
  durationMs: number;
  startedAt: string;
  completedAt: string;
  environment: string;
  projectId: string;
  beforeState: {
    protectedCollectionsCount: number;
    protectedDocumentsCount: number;
    dynamicCollectionsCount: number;
    dynamicDocumentsCount: number;
    redisKeysCount: number;
    protectedFingerprint: string;
  };
  purgeExecution?: {
    firestoreDeletedDocs: number;
    purgedCollections: string[];
    redisFlushed: boolean;
    redisKeysBefore: number;
    redisKeysAfter: number;
    rtdbReset: boolean;
  };
  integrityVerification: ProtectedIntegrityVerificationResult;
  systemSignalSync?: {
    success: boolean;
    timestamp: number;
    firestoreSignal: boolean;
    rtdbSignal: boolean;
  };
  seedResult?: SeedExecutionResult;
  errors?: string[];
}

/**
 * Asserts that the current runtime environment is explicitly authorized for destructive lifecycle resets.
 */
export function assertDestructiveOperationsAllowed(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const isPurgeDisabled = process.env.DATABASE_PURGE_ALLOWED === "false";
  const currentProjectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "unknown";

  if (isProduction) {
    throw new Error(
      "SECURITY_VIOLATION: Destructive database lifecycle operations are permanently blocked in PRODUCTION environment."
    );
  }

  if (isPurgeDisabled) {
    throw new Error(
      "SECURITY_VIOLATION: DATABASE_PURGE_ALLOWED is explicitly set to 'false'. Operation blocked by server security gate."
    );
  }

  const authorizedProjects = [
    "gaurav-portfolio-improved",
    "gaurav-portfolio-dev",
    "localhost",
    "development",
  ];

  if (!authorizedProjects.includes(currentProjectId)) {
    throw new Error(
      `SECURITY_VIOLATION: Project identity '${currentProjectId}' is not in the authorized development project list.`
    );
  }
}

export class LifecycleOrchestrator {
  /**
   * Performs a comprehensive, non-destructive audit of all data stores.
   */
  public async auditDatabase(): Promise<DatabaseAuditReport> {
    const startTime = Date.now();
    const auditId = `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const environment = process.env.NODE_ENV || "development";
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "gaurav-portfolio-improved";
    const isDestructiveAllowed = environment !== "production" && process.env.DATABASE_PURGE_ALLOWED !== "false";

    // 1. Discover all root Firestore collections
    const discoveredCollections = await firestoreDataSource.listAllCollections();

    // 2. Classify and detect unclassified collections
    let isFailClosedSafe = true;
    const unclassifiedCollections: string[] = [];
    const protectedFirestoreCollections: Array<{ name: string; count: number; description: string }> = [];
    const dynamicFirestoreCollections: Array<{ name: string; count: number; description: string }> = [];

    let totalProtectedDocuments = 0;
    let totalDynamicDocuments = 0;

    for (const colName of discoveredCollections) {
      const classification = classifyEntity(colName);
      const policyDef = LIFECYCLE_POLICY[colName];

      try {
        const docs = await firestoreDataSource.getAllDocuments(colName);
        const count = docs.length;

        if (classification === "PROTECTED_CONTENT") {
          protectedFirestoreCollections.push({
            name: colName,
            count,
            description: policyDef?.description || "Protected Content",
          });
          totalProtectedDocuments += count;
        } else if (classification === "DYNAMIC") {
          dynamicFirestoreCollections.push({
            name: colName,
            count,
            description: policyDef?.description || "Dynamic Data",
          });
          totalDynamicDocuments += count;
        } else if (classification === "SYSTEM_SIGNAL") {
          // System signal document
        } else {
          isFailClosedSafe = false;
          unclassifiedCollections.push(colName);
        }
      } catch {
        // Handle read error during audit gracefully
      }
    }

    // 3. RTDB Paths
    const protectedRtdbPaths = [
      { path: "public_signals/cms_sync", description: "Realtime WebSocket change broadcaster" },
    ];
    const dynamicRtdbPaths = [
      { path: "stats/leadCount", description: "Monotonic sequential lead counter node" },
      { path: "rate_limits/", description: "Fallback RTDB rate limits" },
    ];

    // 4. Redis Health
    const redisHealth = await redisDataSource.getDbInfo();

    // 5. Compute deterministic Audit Fingerprint
    const fingerprintPayload = `${discoveredCollections.sort().join(",")}:${totalProtectedDocuments}:${totalDynamicDocuments}:${redisHealth.dbsize}`;
    const auditFingerprint = crypto.createHash("sha256").update(fingerprintPayload).digest("hex");

    adminLogger.latency("LifecycleOrchestrator:auditDatabase", Date.now() - startTime, {
      auditId,
      totalProtectedDocuments,
      totalDynamicDocuments,
      redisDbsize: redisHealth.dbsize,
    });

    return {
      auditId,
      auditFingerprint,
      timestamp: new Date().toISOString(),
      environment,
      projectId,
      isDestructiveAllowed,
      protectedFirestoreCollections,
      protectedRtdbPaths,
      dynamicFirestoreCollections,
      dynamicRtdbPaths,
      totalProtectedDocuments,
      totalDynamicDocuments,
      redisHealth,
      isFailClosedSafe,
      unclassifiedCollections,
    };
  }

  /**
   * Executes DRY RUN with absolute zero mutations.
   */
  public async executeDryRun(): Promise<LifecycleExecutionReceipt> {
    const startTime = Date.now();
    const executionId = `DRY-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const audit = await this.auditDatabase();
    const snapshot = await captureProtectedContentSnapshot("DRY-SNAP");

    const receipt: LifecycleExecutionReceipt = {
      executionId,
      auditId: audit.auditId,
      snapshotId: snapshot.snapshotId,
      operation: "DRY_RUN",
      status: "SUCCESS",
      durationMs: Date.now() - startTime,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      environment: audit.environment,
      projectId: audit.projectId,
      beforeState: {
        protectedCollectionsCount: audit.protectedFirestoreCollections.length,
        protectedDocumentsCount: audit.totalProtectedDocuments,
        dynamicCollectionsCount: audit.dynamicFirestoreCollections.length,
        dynamicDocumentsCount: audit.totalDynamicDocuments,
        redisKeysCount: audit.redisHealth.dbsize,
        protectedFingerprint: snapshot.globalFingerprint,
      },
      integrityVerification: {
        isMatch: true,
        beforeSnapshotId: snapshot.snapshotId,
        afterSnapshotId: snapshot.snapshotId,
        beforeFingerprint: snapshot.globalFingerprint,
        afterFingerprint: snapshot.globalFingerprint,
        driftDetails: [],
      },
    };

    return receipt;
  }

  /**
   * Executes PURGE ONLY: wipes all dynamic data and preserves protected content.
   */
  public async executePurgeOnly(confirmedAuditFingerprint: string): Promise<LifecycleExecutionReceipt> {
    return this.runLifecycle({
      operation: "PURGE_ONLY",
      confirmedAuditFingerprint,
    });
  }

  /**
   * Executes RESET & RESEED: wipes dynamic data, preserves protected content, and seeds synthetic dummy data.
   */
  public async executeResetAndReseed(
    confirmedAuditFingerprint: string,
    seedOptions: SeedOptions
  ): Promise<LifecycleExecutionReceipt> {
    return this.runLifecycle({
      operation: "RESET_AND_RESEED",
      confirmedAuditFingerprint,
      seedOptions,
    });
  }

  /**
   * Internal master execution pipeline.
   */
  private async runLifecycle(params: {
    operation: "PURGE_ONLY" | "RESET_AND_RESEED";
    confirmedAuditFingerprint: string;
    seedOptions?: SeedOptions;
  }): Promise<LifecycleExecutionReceipt> {
    const startTime = Date.now();
    const executionId = `LIFE-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const errors: string[] = [];

    // 1. Assert server-side security authorization
    assertDestructiveOperationsAllowed();

    // 2. Pre-flight fresh audit & Stale audit verification
    const preAudit = await this.auditDatabase();
    if (!preAudit.isFailClosedSafe) {
      throw new Error(
        `FAIL-CLOSED ABORT: Cannot purge database while unclassified collections exist: [${preAudit.unclassifiedCollections.join(
          ", "
        )}]`
      );
    }

    if (preAudit.auditFingerprint !== params.confirmedAuditFingerprint) {
      throw new Error(
        "STALE_AUDIT_DETECTED: Database state changed after audit was viewed. Please refresh the audit and reconfirm."
      );
    }

    // 3. Acquire Tokenized Lifecycle Lock
    const lockHandle = await acquireLifecycleLock(executionId);
    if (!lockHandle) {
      throw new Error(
        "CONCURRENT_EXECUTION_BLOCKED: Another destructive lifecycle operation is currently in progress."
      );
    }

    let preSnapshot: ProtectedSnapshot | null = null;
    let postSnapshot: ProtectedSnapshot | null = null;
    let purgeReport: LifecycleExecutionReceipt["purgeExecution"] | undefined;
    let seedResult: SeedExecutionResult | undefined;
    let signalResult: LifecycleExecutionReceipt["systemSignalSync"] | undefined;
    let finalStatus: LifecycleExecutionReceipt["status"] = "FAILED";

    try {
      // ---------------------------------------------------------------------
      // Stage 1: Capture Pre-Purge Protected SHA-256 Snapshot
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      preSnapshot = await captureProtectedContentSnapshot("PRE-SNAP");

      // ---------------------------------------------------------------------
      // Stage 2: Purge Firestore Dynamic Collections
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      const discoveredCollections = await firestoreDataSource.listAllCollections();
      const { dynamicList } = assertFailClosedClassification(discoveredCollections);

      let totalFirestoreDeleted = 0;
      const purgedCollections: string[] = [];

      for (const colName of dynamicList) {
        await assertLockOwnership(lockHandle);
        const deleted = await firestoreDataSource.deleteCollectionBatched(colName, 400);
        totalFirestoreDeleted += deleted;
        purgedCollections.push(colName);
      }

      // ---------------------------------------------------------------------
      // Stage 3: Purge Realtime Database (RTDB) Dynamic Nodes
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      try {
        await rtdbDataSource.setValue("stats/leadCount", 0);
      } catch (rtdbErr) {
        errors.push(`RTDB reset note: ${String(rtdbErr)}`);
      }

      // ---------------------------------------------------------------------
      // Stage 4: Flush Upstash Redis (Dedicated DB Flush)
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      const redisFlushRes = await redisDataSource.flushAll();
      if (!redisFlushRes.success) {
        errors.push(`Redis FLUSHDB error: ${redisFlushRes.error}`);
      }

      purgeReport = {
        firestoreDeletedDocs: totalFirestoreDeleted,
        purgedCollections,
        redisFlushed: redisFlushRes.success,
        redisKeysBefore: redisFlushRes.dbsizeBefore,
        redisKeysAfter: redisFlushRes.dbsizeAfter,
        rtdbReset: true,
      };

      // ---------------------------------------------------------------------
      // Stage 5: Post-Purge Verification (Dynamic = 0, Redis = 0)
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      const postAudit = await this.auditDatabase();
      if (postAudit.totalDynamicDocuments !== 0) {
        errors.push(`Post-purge verification failed: ${postAudit.totalDynamicDocuments} dynamic docs remain.`);
      }

      // ---------------------------------------------------------------------
      // Stage 6: Compare Protected SHA-256 Fingerprints
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      postSnapshot = await captureProtectedContentSnapshot("POST-SNAP");
      const integrityResult = verifyProtectedSnapshots(preSnapshot, postSnapshot);

      if (!integrityResult.isMatch) {
        errors.push(`PROTECTED INTEGRITY VIOLATION: ${integrityResult.driftDetails.join("; ")}`);
        finalStatus = "FAILED";
        throw new Error(
          `PROTECTED INTEGRITY VIOLATION: Static portfolio data was altered during purge: ${integrityResult.driftDetails.join(
            "; "
          )}`
        );
      }

      // ---------------------------------------------------------------------
      // Stage 7: SYSTEM SIGNAL SYNC (Synchronize Realtime CMS Invalidation)
      // ---------------------------------------------------------------------
      await assertLockOwnership(lockHandle);
      const cmsSignal = await emitCmsChangeSignal("all");
      signalResult = {
        success: cmsSignal.rtdb || cmsSignal.firestore,
        timestamp: cmsSignal.timestamp,
        firestoreSignal: cmsSignal.firestore,
        rtdbSignal: cmsSignal.rtdb,
      };

      // ---------------------------------------------------------------------
      // Stage 8: Synthetic Dummy Seeding (if RESET_AND_RESEED)
      // ---------------------------------------------------------------------
      if (params.operation === "RESET_AND_RESEED" && params.seedOptions) {
        await assertLockOwnership(lockHandle);
        seedResult = await generateSyntheticDevelopmentData(params.seedOptions);
      }

      finalStatus = errors.length === 0 ? "SUCCESS" : "PARTIAL";

      return {
        executionId,
        auditId: preAudit.auditId,
        snapshotId: preSnapshot.snapshotId,
        operation: params.operation,
        status: finalStatus,
        durationMs: Date.now() - startTime,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        environment: preAudit.environment,
        projectId: preAudit.projectId,
        beforeState: {
          protectedCollectionsCount: preAudit.protectedFirestoreCollections.length,
          protectedDocumentsCount: preAudit.totalProtectedDocuments,
          dynamicCollectionsCount: preAudit.dynamicFirestoreCollections.length,
          dynamicDocumentsCount: preAudit.totalDynamicDocuments,
          redisKeysCount: preAudit.redisHealth.dbsize,
          protectedFingerprint: preSnapshot.globalFingerprint,
        },
        purgeExecution: purgeReport,
        integrityVerification: integrityResult,
        systemSignalSync: signalResult,
        seedResult,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(errorMsg);

      return {
        executionId,
        auditId: preAudit.auditId,
        snapshotId: preSnapshot ? preSnapshot.snapshotId : "NONE",
        operation: params.operation,
        status: "FAILED",
        durationMs: Date.now() - startTime,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        environment: preAudit.environment,
        projectId: preAudit.projectId,
        beforeState: {
          protectedCollectionsCount: preAudit.protectedFirestoreCollections.length,
          protectedDocumentsCount: preAudit.totalProtectedDocuments,
          dynamicCollectionsCount: preAudit.dynamicFirestoreCollections.length,
          dynamicDocumentsCount: preAudit.totalDynamicDocuments,
          redisKeysCount: preAudit.redisHealth.dbsize,
          protectedFingerprint: preSnapshot ? preSnapshot.globalFingerprint : "NONE",
        },
        purgeExecution: purgeReport,
        integrityVerification: preSnapshot && postSnapshot
          ? verifyProtectedSnapshots(preSnapshot, postSnapshot)
          : {
              isMatch: false,
              beforeSnapshotId: preSnapshot ? preSnapshot.snapshotId : "NONE",
              afterSnapshotId: "NONE",
              beforeFingerprint: preSnapshot ? preSnapshot.globalFingerprint : "NONE",
              afterFingerprint: "NONE",
              driftDetails: [errorMsg],
            },
        systemSignalSync: signalResult,
        seedResult,
        errors,
      };
    } finally {
      // ---------------------------------------------------------------------
      // Release Lifecycle Lock Cleanly
      // ---------------------------------------------------------------------
      await releaseLifecycleLock(lockHandle);
    }
  }
}

export const lifecycleOrchestrator = new LifecycleOrchestrator();
