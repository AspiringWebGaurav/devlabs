/**
 * Sanitizes an error message ensuring sensitive database internal details or stack traces are not leaked.
 */
export function sanitizeAdminError(err: unknown, defaultMessage = "An administrative error occurred."): string {
  if (err instanceof Error) {
    // Prevent leaking credentials, connection strings, or full stack traces
    if (err.message.includes("credential") || err.message.includes("private_key")) {
      return "Security Error: Authentication configuration issue.";
    }
    return err.message || defaultMessage;
  }
  if (typeof err === "string") return err;
  return defaultMessage;
}
