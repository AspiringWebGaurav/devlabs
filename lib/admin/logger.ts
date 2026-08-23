export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMetadata {
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  operation: string;
  message?: string;
  durationMs?: number;
  meta?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class AdminLogger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private formatLog(
    level: LogLevel,
    operation: string,
    message?: string,
    meta?: LogMetadata,
    durationMs?: number,
    err?: unknown
  ): StructuredLog {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      ...(durationMs !== undefined && { durationMs }),
      ...(meta && Object.keys(meta).length > 0 && { meta }),
    };

    if (err) {
      if (err instanceof Error) {
        log.error = {
          name: err.name,
          message: err.message,
          ...(this.isDevelopment && { stack: err.stack }),
        };
      } else {
        log.error = {
          name: "UnknownError",
          message: String(err),
        };
      }
    }

    return log;
  }

  public debug(operation: string, message?: string, meta?: LogMetadata): void {
    if (this.isDevelopment) {
      const payload = this.formatLog("debug", operation, message, meta);
      console.debug(`[ADMIN-DEBUG] [${payload.operation}]`, payload.message || "", payload.meta || "");
    }
  }

  public info(operation: string, message?: string, meta?: LogMetadata): void {
    const payload = this.formatLog("info", operation, message, meta);
    console.info(`[ADMIN-INFO] [${payload.operation}]`, payload.message || "", payload.meta || "");
  }

  public warn(operation: string, message?: string, meta?: LogMetadata): void {
    const payload = this.formatLog("warn", operation, message, meta);
    console.warn(`[ADMIN-WARN] [${payload.operation}]`, payload.message || "", payload.meta || "");
  }

  public error(operation: string, err: unknown, message?: string, meta?: LogMetadata): void {
    const payload = this.formatLog("error", operation, message, meta, undefined, err);
    console.error(`[ADMIN-ERROR] [${payload.operation}]`, payload.message || "", payload.error || "", payload.meta || "");
  }

  public latency(operation: string, durationMs: number, meta?: LogMetadata): void {
    const payload = this.formatLog("info", operation, `Executed in ${durationMs}ms`, meta, durationMs);
    if (this.isDevelopment || durationMs > 1000) {
      console.info(`[ADMIN-LATENCY] [${payload.operation}] ${durationMs}ms`, payload.meta || "");
    }
  }
}

export const adminLogger = new AdminLogger();
