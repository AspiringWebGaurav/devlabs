import { ApiError } from "./error";

export type CancellationReason =
  | "DEPENDENCY_TIMEOUT"
  | "CLIENT_ABORT"
  | "PARENT_ABORT"
  | "NETWORK_FAILURE";

export interface FetchWithTimeoutOptions extends RequestInit {
  isParentInternalSignal?: boolean;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const parentSignal = options.signal;
  if (parentSignal?.aborted) {
    clearTimeout(timeoutId);
    const reason: CancellationReason = options.isParentInternalSignal
      ? "PARENT_ABORT"
      : "CLIENT_ABORT";
    const abortErr = new Error(
      `Request to ${new URL(url).hostname} was aborted before dispatch (${reason}).`
    );
    abortErr.name = "AbortError";
    (abortErr as unknown as { cancellationReason: CancellationReason }).cancellationReason = reason;
    throw abortErr;
  }

  const combinedSignal = parentSignal
    ? AbortSignal.any([parentSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(url, { ...options, signal: combinedSignal });
    return response;
  } catch {
    if (timeoutController.signal.aborted) {
      throw new ApiError(
        "GATEWAY_TIMEOUT",
        `Request to ${new URL(url).hostname} timed out after ${timeoutMs}ms.`,
        undefined,
        { cancellationReason: "DEPENDENCY_TIMEOUT" }
      );
    }
    if (parentSignal?.aborted) {
      const reason: CancellationReason = options.isParentInternalSignal
        ? "PARENT_ABORT"
        : "CLIENT_ABORT";
      const abortErr = new Error(
        `Request to ${new URL(url).hostname} was cancelled by caller (${reason}).`
      );
      abortErr.name = "AbortError";
      (abortErr as unknown as { cancellationReason: CancellationReason }).cancellationReason = reason;
      throw abortErr;
    }
    throw new ApiError(
      "GATEWAY_UNAVAILABLE",
      `Network connection to ${new URL(url).hostname} failed.`,
      undefined,
      { cancellationReason: "NETWORK_FAILURE" }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
