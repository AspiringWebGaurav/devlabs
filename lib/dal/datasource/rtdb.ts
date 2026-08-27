import { getAdminDb } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";
import type { Database } from "firebase-admin/database";

class RtdbDataSource {
  private getDb(): Database | null {
    return getAdminDb();
  }

  /**
   * Reads data from a specific path in Realtime Database.
   */
  public async getValue<T>(path: string): Promise<T | null> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) {
      adminLogger.warn("RtdbDataSource:getValue", "Firebase Admin RTDB not configured", { path });
      return null;
    }

    try {
      const snapshot = await db.ref(path).once("value");
      adminLogger.latency(`RTDB:getValue:${path}`, Date.now() - startTime);

      if (!snapshot.exists()) return null;
      return snapshot.val() as T;
    } catch (err) {
      adminLogger.error(`RTDB:getValue:${path}`, err, "Failed to get RTDB value");
      throw err;
    }
  }

  /**
   * Sets data at a specific path in Realtime Database.
   */
  public async setValue<T>(path: string, value: T): Promise<void> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firebase Admin RTDB not configured");

    try {
      await db.ref(path).set(value);
      adminLogger.latency(`RTDB:setValue:${path}`, Date.now() - startTime);
    } catch (err) {
      adminLogger.error(`RTDB:setValue:${path}`, err, "Failed to set RTDB value");
      throw err;
    }
  }

  /**
   * Pushes a new child with an auto-generated key at a specific path.
   */
  public async pushValue<T>(path: string, value: T): Promise<string | null> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firebase Admin RTDB not configured");

    try {
      const ref = db.ref(path).push();
      await ref.set(value);
      adminLogger.latency(`RTDB:pushValue:${path}`, Date.now() - startTime);
      return ref.key;
    } catch (err) {
      adminLogger.error(`RTDB:pushValue:${path}`, err, "Failed to push RTDB value");
      throw err;
    }
  }
}

export const rtdbDataSource = new RtdbDataSource();
