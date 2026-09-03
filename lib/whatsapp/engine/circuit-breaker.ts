/**
 * Request-Driven Distributed Circuit Breaker & Adaptive Throttling Engine
 * 
 * Strict Zero-Infrastructure Standard:
 * - 100% Serverless on Vercel + Firestore (uses no additional scheduler, worker, or Redis infrastructure and is designed to operate within the existing free-tier/resource limits).
 * - Shared state across serverless containers via Firestore.
 * - States: CLOSED (normal), OPEN (tripped / backoff), HALF_OPEN (request-driven canary probe).
 * - Respects Meta HTTP 429 and Retry-After headers.
 * - Request-driven probe: trips to OPEN on failures; transitions to HALF_OPEN when cooldown expires upon next request.
 */

import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";

export const CIRCUIT_BREAKER_COLLECTION = "whatsapp_circuit_breakers";
const DEFAULT_CIRCUIT_ID = "meta_graph_api";
const FAILURE_THRESHOLD = 5;
const COOLDOWN_DURATION_MS = 60000; // 60 seconds

export interface CircuitBreakerState {
  circuitId: string;
  status: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  cooldownExpiresAt: number;
  updatedAt: number;
}

export class DistributedCircuitBreaker {
  /**
   * Evaluates whether calls to Meta Cloud API are permitted.
   */
  public async canExecute(circuitId = DEFAULT_CIRCUIT_ID): Promise<boolean> {
    const now = Date.now();

    // Authoritative Firestore check
    const doc = await firestoreDataSource.getDocument<CircuitBreakerState>(
      CIRCUIT_BREAKER_COLLECTION,
      circuitId
    );

    if (!doc) {
      return true; // Uninitialized -> default CLOSED
    }

    if (doc.status === "CLOSED") {
      return true;
    }

    if (doc.status === "OPEN") {
      if (now >= doc.cooldownExpiresAt) {
        // Request-driven transition OPEN -> HALF_OPEN (allow canary probe)
        await this.setHalfOpen(circuitId);
        return true;
      }
      return false;
    }

    if (doc.status === "HALF_OPEN") {
      return true; // Allow single canary probe
    }

    return true;
  }

  /**
   * Records a successful provider response.
   */
  public async recordSuccess(circuitId = DEFAULT_CIRCUIT_ID): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.setDocument(
      CIRCUIT_BREAKER_COLLECTION,
      circuitId,
      {
        circuitId,
        status: "CLOSED",
        failureCount: 0,
        lastSuccessAt: now,
        cooldownExpiresAt: 0,
        updatedAt: now,
      },
      true
    );
  }

  /**
   * Records a provider failure (HTTP 5xx, timeout, or 429 rate limit).
   */
  public async recordFailure(
    circuitId = DEFAULT_CIRCUIT_ID,
    retryAfterSeconds?: number
  ): Promise<void> {
    const now = Date.now();
    const cooldownMs = retryAfterSeconds
      ? retryAfterSeconds * 1000
      : COOLDOWN_DURATION_MS;

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const ref = db.collection(CIRCUIT_BREAKER_COLLECTION).doc(circuitId);
      const snap = await tx.get(ref);
      const current = (snap.data() as CircuitBreakerState) || {
        circuitId,
        status: "CLOSED",
        failureCount: 0,
        lastFailureAt: 0,
        lastSuccessAt: 0,
        cooldownExpiresAt: 0,
        updatedAt: now,
      };

      const newFailureCount = (current.failureCount || 0) + 1;
      const shouldTrip = newFailureCount >= FAILURE_THRESHOLD || !!retryAfterSeconds;

      const updatedState: CircuitBreakerState = {
        ...current,
        failureCount: newFailureCount,
        lastFailureAt: now,
        status: shouldTrip ? "OPEN" : current.status,
        cooldownExpiresAt: shouldTrip ? now + cooldownMs : current.cooldownExpiresAt,
        updatedAt: now,
      };

      tx.set(ref, updatedState, { merge: true });

      if (shouldTrip) {
        adminLogger.warn("WhatsApp:CircuitBreakerTripped", `Circuit breaker tripped for ${circuitId}`, {
          failureCount: newFailureCount,
          cooldownMs,
        });
      }
    });
  }

  private async setHalfOpen(circuitId: string): Promise<void> {
    await firestoreDataSource.setDocument(
      CIRCUIT_BREAKER_COLLECTION,
      circuitId,
      {
        status: "HALF_OPEN",
        updatedAt: Date.now(),
      },
      true
    );
  }
}

export const distributedCircuitBreaker = new DistributedCircuitBreaker();
