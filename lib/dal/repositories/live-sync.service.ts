import { rtdbDataSource } from "@/lib/dal/datasource/rtdb";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";

export interface CmsChangeSignal {
  domain: string;
  version?: number;
  timestamp: number;
}

export interface CmsSignalEmitResult {
  rtdb: boolean;
  firestore: boolean;
  timestamp: number;
}

/**
 * Emits a safe public change signal across Firebase realtime channels (RTDB + Firestore)
 * strictly AFTER a successful database mutation and Next.js cache revalidation.
 */
export async function emitCmsChangeSignal(domain: string, version?: number): Promise<CmsSignalEmitResult> {
  const signal: CmsChangeSignal = {
    domain,
    version: version ?? 1,
    timestamp: Date.now(),
  };

  let rtdbSuccess = false;
  let firestoreSuccess = false;

  // 1. Write to RTDB for ultra-low latency push (if configured)
  try {
    await rtdbDataSource.setValue("public_signals/cms_sync", signal);
    rtdbSuccess = true;
  } catch (rtdbErr) {
    adminLogger.debug("LiveSync:rtdbSkipped", "RTDB signal emit skipped or unavailable", { error: String(rtdbErr) });
  }

  // 2. Write to public Firestore signal document (for robust onSnapshot fallback)
  try {
    await firestoreDataSource.setDocument("portfolio_signal", "sync", signal, true);
    firestoreSuccess = true;
  } catch (fsErr) {
    adminLogger.debug("LiveSync:firestoreSkipped", "Firestore signal emit skipped or unavailable", { error: String(fsErr) });
  }

  adminLogger.info("LiveSync:emitSignal", "CMS change signal emitted", {
    domain,
    version: signal.version,
    timestamp: signal.timestamp,
    rtdb: rtdbSuccess,
    firestore: firestoreSuccess,
  });

  return {
    rtdb: rtdbSuccess,
    firestore: firestoreSuccess,
    timestamp: signal.timestamp,
  };
}
