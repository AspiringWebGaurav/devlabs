/**
 * Native Zero-Dependency In-Memory PKZip Archive Generator
 *
 * Implements standard PKZip binary specification (RFC 1951 / APPNOTE.TXT)
 * using Node.js built-in `node:zlib` (deflateRawSync and crc32).
 *
 * Produces 100% compliant `.zip` archives readable on Windows Explorer,
 * macOS Archive Utility, iOS Files, Linux unzip, and Android.
 */

import zlib from "node:zlib";

export interface ZipFileEntry {
  name: string;
  content: string | Buffer;
}

/**
 * Packs multiple file entries into a valid standard PKZip Buffer in memory.
 */
export function createZipArchive(files: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  // DOS timestamp encoding helper (current local time)
  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const file of files) {
    const isDir = Boolean(file.name.endsWith("/"));
    const nameBuf = Buffer.from(file.name, "utf8");
    const contentBuf = isDir
      ? Buffer.alloc(0)
      : Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, "utf8");

    const crc = isDir ? 0 : zlib.crc32(contentBuf);
    const compressed = isDir ? Buffer.alloc(0) : zlib.deflateRawSync(contentBuf);
    const compMethod = isDir ? 0 : 8; // 0 = Stored (directory), 8 = Deflate (file)

    // 1. Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature (PK\x03\x04)
    localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename enabled)
    localHeader.writeUInt16LE(compMethod, 8); // Compression method
    localHeader.writeUInt16LE(dosTime, 10); // Last mod file time
    localHeader.writeUInt16LE(dosDate, 12); // Last mod file date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
    localHeader.writeUInt32LE(contentBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // 2. Central Directory Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature (PK\x01\x02)
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // Flags (UTF-8 enabled)
    centralHeader.writeUInt16LE(compMethod, 10); // Compression method
    centralHeader.writeUInt16LE(dosTime, 12); // Last mod time
    centralHeader.writeUInt16LE(dosDate, 14); // Last mod date
    centralHeader.writeUInt32LE(crc, 16); // CRC-32
    centralHeader.writeUInt32LE(compressed.length, 20); // Compressed size
    centralHeader.writeUInt32LE(contentBuf.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    // External file attributes: 0x10 is MS-DOS directory attribute, (0x41ed << 16) is Unix drwxr-xr-x
    // For files: 0x20 is MS-DOS archive attribute, (0x81a4 << 16) is Unix -rw-r--r--
    const externalAttr = isDir
      ? (((0x41ed * 65536) | 0x10) >>> 0)
      : (((0x81a4 * 65536) | 0x20) >>> 0);
    centralHeader.writeUInt32LE(externalAttr, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  // 3. End of Central Directory Record (22 bytes)
  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // End of central directory signature (PK\x05\x06)
  endRecord.writeUInt16LE(0, 4); // Disk number
  endRecord.writeUInt16LE(0, 6); // Disk with central directory
  endRecord.writeUInt16LE(files.length, 8); // Entries on this disk
  endRecord.writeUInt16LE(files.length, 10); // Total entries
  endRecord.writeUInt32LE(centralDirSize, 12); // Size of central directory
  endRecord.writeUInt32LE(offset, 16); // Offset of central directory
  endRecord.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, endRecord]);
}
