/**
 * Meta Graph API Error Classification & Normalizer
 */

export interface MetaErrorDetails {
  message: string;
  type?: string;
  code?: number;
  errorSubcode?: number;
  fbtraceId?: string;
}

export class MetaApiError extends Error {
  public readonly code?: number;
  public readonly errorSubcode?: number;
  public readonly fbtraceId?: string;
  public readonly errorType?: string;

  constructor(details: MetaErrorDetails) {
    super(`Meta API Error [${details.code || "UNKNOWN"}]: ${details.message}`);
    this.name = "MetaApiError";
    this.code = details.code;
    this.errorSubcode = details.errorSubcode;
    this.fbtraceId = details.fbtraceId;
    this.errorType = details.type;
  }
}

export function isTokenExpiredError(error: unknown): boolean {
  if (error instanceof MetaApiError) {
    return error.code === 190; // Invalid or expired OAuth access token
  }
  return false;
}
