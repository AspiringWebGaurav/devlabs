/**
 * Protected Content Deterministic SHA-256 Integrity Snapshot Engine
 * 
 * Captures cryptographic fingerprints of all entities classified as PROTECTED_CONTENT
 * before any destructive operation, and verifies byte-for-byte immutability post-operation.
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { getProtectedContentCollectionNames } from "./policy";
import { adminLogger } from "@/lib/admin/logger";

export interface CollectionSnapshotDetail {
  collectionName: string;
  documentCount: number;
  documentIds: string[];
  collectionHash: string;
}

export interface ProtectedSnapshot {
  snapshotId: string;
  timestamp: string;
  globalFingerprint: string;
  entityCount: number;
  documentCount: number;
  collections: Record<string, CollectionSnapshotDetail>;
}

export interface ProtectedIntegrityVerificationResult {
  isMatch: boolean;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  driftDetails: string[];
}

/**
 * Deterministically sorts object keys recursively to guarantee canonical JSON output.
 */
function canonicalizeData(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalizeData);
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const canonicalObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    // Ignore volatile internal cache keys or timestamps if any exist in document metadata
    canonicalObj[key] = canonicalizeData(record[key]);
  }

  return canonicalObj;
}

/**
 * Captures a complete deterministic cryptographic snapshot of all PROTECTED_CONTENT collections.
 */
export async function captureProtectedContentSnapshot(snapshotIdPrefix = "SNAP"): Promise<ProtectedSnapshot> {
  const startTime = Date.now();
  const snapshotId = `${snapshotIdPrefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const protectedCollections = getProtectedContentCollectionNames().sort();

  const collections: Record<string, CollectionSnapshotDetail> = {};
  let totalDocCount = 0;
  const globalHashPayload: string[] = [];

  for (const colName of protectedCollections) {
    const docs = await firestoreDataSource.getAllDocuments<Record<string, unknown>>(colName);
    // Sort documents by document ID alphabetically for deterministic ordering
    docs.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));

    const docIds = docs.map((d) => String(d.id || ""));
    totalDocCount += docs.length;

    // Canonical JSON representation of all documents in this collection
    const canonicalDocs = docs.map((d) => canonicalizeData(d));
    const collectionJson = JSON.stringify(canonicalDocs);
    const collectionHash = crypto.createHash("sha256").update(collectionJson).digest("hex");

    collections[colName] = {
      collectionName: colName,
      documentCount: docs.length,
      documentIds: docIds,
      collectionHash,
    };

    globalHashPayload.push(`${colName}:${collectionHash}:${docIds.join(",")}`);
  }

  const globalFingerprint = crypto
    .createHash("sha256")
    .update(globalHashPayload.join("|"))
    .digest("hex");

  const snapshot: ProtectedSnapshot = {
    snapshotId,
    timestamp: new Date().toISOString(),
    globalFingerprint,
    entityCount: protectedCollections.length,
    documentCount: totalDocCount,
    collections,
  };

  adminLogger.latency("Fingerprint:captureSnapshot", Date.now() - startTime, {
    snapshotId,
    entityCount: snapshot.entityCount,
    documentCount: snapshot.documentCount,
    globalFingerprint: snapshot.globalFingerprint.slice(0, 12) + "...",
  });

  return snapshot;
}

/**
 * Compares two snapshots and returns verification details and drift diagnostics.
 */
export function verifyProtectedSnapshots(
  before: ProtectedSnapshot,
  after: ProtectedSnapshot
): ProtectedIntegrityVerificationResult {
  const driftDetails: string[] = [];

  if (before.globalFingerprint !== after.globalFingerprint) {
    driftDetails.push(
      `Global fingerprint mismatch: Before (${before.globalFingerprint.slice(0, 12)}...) vs After (${after.globalFingerprint.slice(
        0,
        12
      )}...)`
    );
  }

  if (before.documentCount !== after.documentCount) {
    driftDetails.push(
      `Total document count changed: Before (${before.documentCount}) vs After (${after.documentCount})`
    );
  }

  for (const colName of Object.keys(before.collections)) {
    const beforeCol = before.collections[colName];
    const afterCol = after.collections[colName];

    if (!afterCol) {
      driftDetails.push(`Protected collection missing after purge: ${colName}`);
      continue;
    }

    if (beforeCol.collectionHash !== afterCol.collectionHash) {
      driftDetails.push(
        `Collection content drifted in [${colName}]: Hash before (${beforeCol.collectionHash.slice(
          0,
          8
        )}) vs after (${afterCol.collectionHash.slice(0, 8)})`
      );
    }

    if (beforeCol.documentCount !== afterCol.documentCount) {
      driftDetails.push(
        `Document count drifted in [${colName}]: Before (${beforeCol.documentCount}) vs after (${afterCol.documentCount})`
      );
    }
  }

  const isMatch = driftDetails.length === 0;

  return {
    isMatch,
    beforeSnapshotId: before.snapshotId,
    afterSnapshotId: after.snapshotId,
    beforeFingerprint: before.globalFingerprint,
    afterFingerprint: after.globalFingerprint,
    driftDetails,
  };
}
