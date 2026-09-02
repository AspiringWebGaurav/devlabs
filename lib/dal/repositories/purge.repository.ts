/**
 * Purge & Database Lifecycle Repository (10/10 Enterprise Hardened)
 * 
 * DAL repository wrapping lifecycle orchestration, pre-flight audits, dry runs,
 * cleanups, resets, canonical seeding, reconciliation, and persistent execution history.
 */

import { BaseRepository } from "./base.repository";
import {
  lifecycleOrchestrator,
  type DatabaseAuditReport,
  type LifecycleExecutionPlan,
  type LifecycleExecutionReceipt,
  type LifecycleOperationType,
  type SanitizedActor,
} from "@/lib/dal/lifecycle/orchestrator";
import type { RepositoryResult } from "./types";

export class PurgeRepository extends BaseRepository {
  constructor() {
    super("PurgeRepository");
  }

  /**
   * Performs a non-destructive audit of all collections, documents, and stores.
   */
  public async auditDatabase(): Promise<RepositoryResult<DatabaseAuditReport>> {
    return this.executeQuery("auditDatabase", async () => {
      return await lifecycleOrchestrator.auditDatabase();
    });
  }

  /**
   * Generates an immutable preflight execution plan.
   */
  public async generatePlan(
    operation: LifecycleOperationType
  ): Promise<RepositoryResult<LifecycleExecutionPlan>> {
    return this.executeQuery("generatePlan", async () => {
      return await lifecycleOrchestrator.generatePlan(operation);
    });
  }

  /**
   * Executes a zero-mutation DRY RUN simulating the lifecycle operation.
   */
  public async executeDryRun(
    operation: LifecycleOperationType = "CLEAN"
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeDryRun", async () => {
      return await lifecycleOrchestrator.executeDryRun(operation);
    });
  }

  /**
   * Executes CLEAN: Wipes dynamic data and flushes Redis while preserving static content and admin auth.
   */
  public async executeClean(
    confirmedAuditFingerprint: string,
    actor: SanitizedActor
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeClean", async () => {
      return await lifecycleOrchestrator.executeClean(confirmedAuditFingerprint, actor);
    });
  }

  /**
   * Executes RESET: Full environment reset wiping dynamic and static content (auth preserved).
   */
  public async executeReset(
    confirmedAuditFingerprint: string,
    actor: SanitizedActor
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeReset", async () => {
      return await lifecycleOrchestrator.executeReset(confirmedAuditFingerprint, actor);
    });
  }

  /**
   * Executes SEED: Populates 14 canonical static portfolio content pillars into Firestore.
   */
  public async executeSeed(
    confirmedAuditFingerprint: string,
    actor: SanitizedActor
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeSeed", async () => {
      return await lifecycleOrchestrator.executeSeed(confirmedAuditFingerprint, actor);
    });
  }

  /**
   * Executes RESEED: Restores all 14 canonical static content pillars to authoritative seed state.
   */
  public async executeReseed(
    confirmedAuditFingerprint: string,
    actor: SanitizedActor
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeReseed", async () => {
      return await lifecycleOrchestrator.executeReseed(confirmedAuditFingerprint, actor);
    });
  }

  /**
   * Executes RECONCILE: Detects full-system drift and idempotently repairs missing static documents.
   */
  public async executeReconcile(
    confirmedAuditFingerprint: string,
    actor: SanitizedActor
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeReconcile", async () => {
      return await lifecycleOrchestrator.executeReconcile(confirmedAuditFingerprint, actor);
    });
  }

  /**
   * Retrieves server cursor-paginated execution history from persistent storage.
   */
  public async getRecentExecutions(
    limit = 10,
    cursor?: string
  ): Promise<RepositoryResult<{ receipts: LifecycleExecutionReceipt[]; nextCursor?: string }>> {
    return this.executeQuery("getRecentExecutions", async () => {
      return await lifecycleOrchestrator.getRecentExecutions(limit, cursor);
    });
  }
}

export const purgeRepository = new PurgeRepository();
