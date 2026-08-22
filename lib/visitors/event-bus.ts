import { EventEmitter } from "events";
import { VisitorEventPayload } from "./types";

interface ServerEventBusHolder {
  __visitor_event_bus?: EventEmitter;
}

const globalForBus = globalThis as unknown as ServerEventBusHolder;

if (!globalForBus.__visitor_event_bus) {
  const bus = new EventEmitter();
  bus.setMaxListeners(200); // Allow multiple admin and visitor SSE listeners
  globalForBus.__visitor_event_bus = bus;
}

export const visitorEventBus: EventEmitter = globalForBus.__visitor_event_bus;

/**
 * Publishes a typed visitor event to the server event bus.
 */
export function publishVisitorEvent(event: VisitorEventPayload): void {
  // 1. Broadcast to general admin channel
  visitorEventBus.emit("visitor_event", event);
  visitorEventBus.emit(event.type, event);

  // 2. Broadcast to visitor-specific channel (for targeted actions like BAN/UNBAN)
  if (event.visitorId) {
    visitorEventBus.emit(`visitor:${event.visitorId}`, event);
  }
}

/**
 * Subscribes to all visitor events (used by Admin Dashboard SSE).
 */
export function subscribeToAllVisitorEvents(listener: (event: VisitorEventPayload) => void): () => void {
  visitorEventBus.on("visitor_event", listener);
  return () => {
    visitorEventBus.off("visitor_event", listener);
  };
}

/**
 * Subscribes to events for a specific visitor (used by Visitor SSE for instant BAN/UNBAN).
 */
export function subscribeToVisitorEvents(
  visitorId: string,
  listener: (event: VisitorEventPayload) => void
): () => void {
  const channel = `visitor:${visitorId}`;
  visitorEventBus.on(channel, listener);
  return () => {
    visitorEventBus.off(channel, listener);
  };
}
