import { getAdminStorage } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";
import type { Bucket } from "@google-cloud/storage";

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface StorageUploadResult {
  storagePath: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
}

export interface StorageFileMetadata {
  name: string;
  size: number;
  contentType: string;
  updated: string;
  publicUrl: string;
}

class StorageDataSource {
  private getBucket(): Bucket | null {
    const storage = getAdminStorage();
    if (!storage) return null;
    return storage.bucket();
  }

  /**
   * Uploads a Buffer to Firebase Storage at the given storagePath.
   * Returns metadata including the public display URL.
   */
  public async uploadBuffer(
    storagePath: string,
    buffer: Buffer,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();
    const bucket = this.getBucket();
    if (!bucket) {
      adminLogger.warn("StorageDataSource:uploadBuffer", "Firebase Storage Admin not configured", { storagePath });
      throw new Error("Firebase Storage Admin not configured");
    }

    try {
      const file = bucket.file(storagePath);
      const mimeType = options.contentType || "application/octet-stream";

      await file.save(buffer, {
        contentType: mimeType,
        metadata: {
          ...options.metadata,
          uploadedAt: new Date().toISOString(),
        },
        resumable: false,
      });

      if (options.isPublic !== false) {
        try {
          await file.makePublic();
        } catch {
          // If makePublic is restricted by bucket policy, publicUrl format is fallback
        }
      }

      // Generate canonical Firebase Storage download URL
      const encodedPath = encodeURIComponent(storagePath);
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
      const fileName = storagePath.split("/").pop() || storagePath;

      adminLogger.latency("Storage:uploadBuffer", Date.now() - startTime, {
        storagePath,
        sizeBytes: buffer.length,
        mimeType,
      });

      return {
        storagePath,
        publicUrl,
        sizeBytes: buffer.length,
        mimeType,
        fileName,
      };
    } catch (err) {
      adminLogger.error("Storage:uploadBuffer", err, `Failed to upload file to ${storagePath}`);
      throw err;
    }
  }

  /**
   * Deletes a physical file from Firebase Storage at the specified storagePath.
   */
  public async deleteFile(storagePath: string): Promise<void> {
    const startTime = Date.now();
    const bucket = this.getBucket();
    if (!bucket) {
      adminLogger.warn("StorageDataSource:deleteFile", "Firebase Storage Admin not configured", { storagePath });
      throw new Error("Firebase Storage Admin not configured");
    }

    try {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
      adminLogger.latency("Storage:deleteFile", Date.now() - startTime, { storagePath });
    } catch (err) {
      adminLogger.error("Storage:deleteFile", err, `Failed to delete file ${storagePath}`);
      throw err;
    }
  }

  /**
   * Checks if a file exists in Firebase Storage.
   */
  public async fileExists(storagePath: string): Promise<boolean> {
    const bucket = this.getBucket();
    if (!bucket) return false;

    try {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      return exists;
    } catch (err) {
      adminLogger.error("Storage:fileExists", err, `Failed to check file existence ${storagePath}`);
      return false;
    }
  }

  /**
   * Lists physical files in the Storage bucket under a specified prefix.
   */
  public async listFiles(prefix?: string): Promise<StorageFileMetadata[]> {
    const startTime = Date.now();
    const bucket = this.getBucket();
    if (!bucket) return [];

    try {
      const [files] = await bucket.getFiles({ prefix });
      const results: StorageFileMetadata[] = files.map((file) => {
        const encodedPath = encodeURIComponent(file.name);
        return {
          name: file.name,
          size: Number(file.metadata.size || 0),
          contentType: String(file.metadata.contentType || "application/octet-stream"),
          updated: String(file.metadata.updated || new Date().toISOString()),
          publicUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`,
        };
      });

      adminLogger.latency("Storage:listFiles", Date.now() - startTime, {
        prefix,
        count: results.length,
      });

      return results;
    } catch (err) {
      adminLogger.error("Storage:listFiles", err, "Failed to list files from bucket");
      throw err;
    }
  }
}

export const storageDataSource = new StorageDataSource();
