/**
 * Formats a timestamp into an ISO-standard Swiss minimalist date string (e.g. 2026-08-23 14:30:00 UTC).
 */
export function formatAdminDateTime(timestamp: number | Date | string): string {
  const date = typeof timestamp === "number" || typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

/**
 * Calculates human-readable relative time (e.g. "5m ago", "2h ago", "Just now").
 */
export function formatRelativeTime(timestamp: number | Date | string): string {
  const date = typeof timestamp === "number" || typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
