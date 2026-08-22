import { NextRequest } from "next/server";
import { isAuthorizedAdminSession } from "@/lib/admin/session";
import { subscribeToAllVisitorEvents } from "@/lib/visitors/event-bus";
import { getVisitorStatsSummary } from "@/lib/visitors/visitor-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminSession(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized. Admin session required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendSSE = async (event: string, data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  // Initial connection hello with current summary stats
  (async () => {
    const summary = await getVisitorStatsSummary();
    await sendSSE("INITIAL_STATS", { summary });
  })();

  // Keep-alive heartbeat comment
  const heartbeatTimer = setInterval(() => {
    writer.write(encoder.encode(`: heartbeat\n\n`)).catch(() => {});
  }, 15000);

  // Subscribe to all live visitor events across the system
  const unsubscribe = subscribeToAllVisitorEvents(async (event) => {
    await sendSSE(event.type, event as unknown as Record<string, unknown>);
  });

  // Recycle stream every 45s to release file handles for clean Turbopack HMR and serverless execution
  const streamTimeout = setTimeout(() => {
    clearInterval(heartbeatTimer);
    unsubscribe();
    try {
      writer.close();
    } catch {
      // Ignored
    }
  }, 45000);

  request.signal.addEventListener("abort", () => {
    clearTimeout(streamTimeout);
    clearInterval(heartbeatTimer);
    unsubscribe();
    try {
      writer.close();
    } catch {
      // Ignored
    }
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
