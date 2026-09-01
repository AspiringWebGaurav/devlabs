/**
 * Purge & Database Lifecycle Repository
 * 
 * DAL repository wrapping lifecycle orchestration, pre-flight audits, dry runs,
 * destructive purges, and synthetic dummy data re-seeding.
 */

import { BaseRepository } from "./base.repository";
import {
  lifecycleOrchestrator,
  type DatabaseAuditReport,
  type LifecycleExecutionReceipt,
} from "@/lib/dal/lifecycle/orchestrator";
import type { SeedOptions } from "@/lib/dal/lifecycle/seed-generator";
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
   * Executes a zero-mutation DRY RUN simulating the lifecycle purge.
   */
  public async executeDryRun(): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeDryRun", async () => {
      return await lifecycleOrchestrator.executeDryRun();
    });
  }

  /**
   * Executes PURGE ONLY to clean all dynamic records while preserving static content.
   */
  public async executePurgeOnly(
    confirmedAuditFingerprint: string
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executePurgeOnly", async () => {
      return await lifecycleOrchestrator.executePurgeOnly(confirmedAuditFingerprint);
    });
  }

  /**
   * Executes RESET & RESEED: purges dynamic data and seeds synthetic dummy data.
   */
  public async executeResetAndReseed(
    confirmedAuditFingerprint: string,
    seedOptions: SeedOptions
  ): Promise<RepositoryResult<LifecycleExecutionReceipt>> {
    return this.executeMutation("executeResetAndReseed", async () => {
      return await lifecycleOrchestrator.executeResetAndReseed(confirmedAuditFingerprint, seedOptions);
    });
  }
}

export const purgeRepository = new PurgeRepository();
