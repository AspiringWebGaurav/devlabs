/**
 * Broadcasts a CMS change signal locally across all open browser tabs
 * in the same origin using BroadcastChannel.
 */
export function broadcastClientCmsChange(domain: string, version?: number): void {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.postMessage({ domain, version, timestamp: Date.now() });
      channel.close();
    } catch {}
  }
}
