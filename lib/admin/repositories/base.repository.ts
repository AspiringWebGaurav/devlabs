import { adminLogger } from "../logger";
import { sanitizeAdminError } from "../utils/error";
import type { RepositoryResult } from "./types";

export abstract class BaseRepository {
  protected repositoryName: string;

  constructor(repositoryName: string) {
    this.repositoryName = repositoryName;
  }

  /**
   * Executes a database query operation with standardized timing, error handling, and structured logging.
   */
  protected async executeQuery<T>(
    operationName: string,
    queryFn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<RepositoryResult<T>> {
    const startTime = Date.now();
    const opKey = `${this.repositoryName}:${operationName}`;

    try {
      const data = await queryFn();
      const durationMs = Date.now() - startTime;
      adminLogger.latency(opKey, durationMs, meta);

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      adminLogger.error(opKey, err, sanitized, meta);

      return {
        success: false,
        data: null,
        error: sanitized,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
