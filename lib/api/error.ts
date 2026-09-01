import { NextResponse } from "next/server";

export const API_ERROR_REGISTRY = {
  // Authentication & Security
  AUTH_REQUIRED: {
    statusCode: 401,
    retryable: false,
    clientMessage: "Authentication is required to perform this action.",
    logSeverity: "WARN",
  },
  AUTH_EXPIRED: {
    statusCode: 401,
    retryable: false,
    clientMessage: "Your session has expired. Please log in again.",
    logSeverity: "INFO",
  },
  INVALID_CREDENTIALS: {
    statusCode: 401,
    retryable: false,
    clientMessage: "Invalid security credentials provided.",
    logSeverity: "WARN",
  },
  OTP_INVALID: {
    statusCode: 400,
    retryable: false,
    clientMessage: "Invalid verification code. Please check and re-enter.",
    logSeverity: "INFO",
  },
  OTP_EXPIRED: {
    statusCode: 400,
    retryable: false,
    clientMessage: "Verification code has expired. Please request a new code.",
    logSeverity: "INFO",
  },
  OTP_LOCKED: {
    statusCode: 429,
    retryable: false,
    clientMessage: "Too many failed attempts. Account temporarily locked.",
    logSeverity: "SECURITY",
  },
  IP_UNAUTHORIZED: {
    statusCode: 403,
    retryable: false,
    clientMessage: "Access from this IP address has not been approved.",
    logSeverity: "SECURITY",
  },
  CSRF_VIOLATION: {
    statusCode: 403,
    retryable: false,
    clientMessage: "Cross-site request forgery protection triggered.",
    logSeverity: "SECURITY",
  },
  BOT_CHALLENGE_FAILED: {
    statusCode: 403,
    retryable: false,
    clientMessage: "Bot verification failed. Please refresh and try again.",
    logSeverity: "WARN",
  },
  OAUTH_EXCHANGE_FAILED: {
    statusCode: 502,
    retryable: true,
    clientMessage: "Failed to authenticate with Google. Please retry.",
    logSeverity: "ERROR",
  },
  OAUTH_PROFILE_FAILED: {
    statusCode: 502,
    retryable: true,
    clientMessage: "Failed to retrieve Google profile. Please retry.",
    logSeverity: "ERROR",
  },

  // Validation
  VALIDATION_FAILED: {
    statusCode: 400,
    retryable: false,
    clientMessage: "Submitted data failed validation constraints.",
    logSeverity: "INFO",
  },
  PAYLOAD_TOO_LARGE: {
    statusCode: 413,
    retryable: false,
    clientMessage: "Payload size exceeds maximum allowed limit.",
    logSeverity: "WARN",
  },
  PROFANITY_DETECTED: {
    statusCode: 422,
    retryable: false,
    clientMessage: "Message contains prohibited or inappropriate content.",
    logSeverity: "WARN",
  },
  TOXICITY_BLOCKED: {
    statusCode: 422,
    retryable: false,
    clientMessage: "Message was flagged by automated moderation.",
    logSeverity: "WARN",
  },

  // Concurrency & State
  CONCURRENCY_LOCK: {
    statusCode: 409,
    retryable: true,
    clientMessage: "An identical request is currently in progress. Please wait.",
    logSeverity: "INFO",
  },
  DRAFT_CONFLICT: {
    statusCode: 409,
    retryable: true,
    clientMessage: "Draft was modified in another session. Please reload.",
    logSeverity: "INFO",
  },
  TURN_LOCKED: {
    statusCode: 423,
    retryable: false,
    clientMessage: "Awaiting reply before sending additional messages.",
    logSeverity: "INFO",
  },
  VERSION_MISMATCH: {
    statusCode: 409,
    retryable: true,
    clientMessage: "Resource modified concurrently. Please refresh.",
    logSeverity: "INFO",
  },

  // Rate Limiting
  RATE_LIMITED_BURST: {
    statusCode: 429,
    retryable: true,
    clientMessage: "Please wait a moment before submitting again.",
    logSeverity: "INFO",
  },
  RATE_LIMITED_HOURLY: {
    statusCode: 429,
    retryable: true,
    clientMessage: "Hourly request limit reached. Please try again later.",
    logSeverity: "INFO",
  },
  RATE_LIMITED_DAILY: {
    statusCode: 429,
    retryable: false,
    clientMessage: "Daily limit reached. Please try again tomorrow.",
    logSeverity: "WARN",
  },
  RATE_LIMITED_GLOBAL: {
    statusCode: 429,
    retryable: true,
    clientMessage: "Service is experiencing high traffic. Please retry shortly.",
    logSeverity: "WARN",
  },

  // Third-Party, Database & Network
  GATEWAY_TIMEOUT: {
    statusCode: 504,
    retryable: true,
    clientMessage: "Upstream service took too long to respond.",
    logSeverity: "ERROR",
  },
  GATEWAY_UNAVAILABLE: {
    statusCode: 502,
    retryable: true,
    clientMessage: "External service is currently unavailable.",
    logSeverity: "ERROR",
  },
  DELIVERY_UNCERTAIN: {
    statusCode: 502,
    retryable: false,
    clientMessage: "Submission received but confirmation is pending. Please verify before resending.",
    logSeverity: "WARN",
  },
  DATABASE_TIMEOUT: {
    statusCode: 500,
    retryable: true,
    clientMessage: "Database operation timed out. Please retry.",
    logSeverity: "ERROR",
  },
  STORAGE_ERROR: {
    statusCode: 500,
    retryable: true,
    clientMessage: "Failed to persist uploaded media. Please retry.",
    logSeverity: "ERROR",
  },
  STORAGE_STREAM_TIMEOUT: {
    statusCode: 500,
    retryable: true,
    clientMessage: "Media upload stream timed out.",
    logSeverity: "ERROR",
  },
  INTERNAL_ERROR: {
    statusCode: 500,
    retryable: true,
    clientMessage: "An unexpected server error occurred. Please retry.",
    logSeverity: "ERROR",
  },
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_REGISTRY;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly logSeverity: string;

  constructor(
    public readonly code: ApiErrorCode,
    customMessage?: string,
    public readonly retryAfterSeconds?: number,
    public readonly details?: Record<string, unknown>
  ) {
    const meta = API_ERROR_REGISTRY[code] || API_ERROR_REGISTRY.INTERNAL_ERROR;
    super(customMessage || meta.clientMessage);
    this.name = "ApiError";
    this.statusCode = meta.statusCode;
    this.retryable = meta.retryable;
    this.logSeverity = meta.logSeverity;
  }
}

export function createApiErrorResponse(
  err: unknown,
  requestId: string,
  extraData?: Record<string, unknown>
): NextResponse {
  if (err instanceof ApiError) {
    const headers: Record<string, string> = { "x-request-id": requestId };
    if (err.retryAfterSeconds) {
      headers["Retry-After"] = String(err.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          retryable: err.retryable,
          retryAfterSeconds: err.retryAfterSeconds,
          requestId,
        },
        ...extraData,
      },
      { status: err.statusCode, headers }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: API_ERROR_REGISTRY.INTERNAL_ERROR.clientMessage,
        retryable: true,
        requestId,
      },
      ...extraData,
    },
    { status: 500, headers: { "x-request-id": requestId } }
  );
}
