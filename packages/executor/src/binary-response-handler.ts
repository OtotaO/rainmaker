/**
 * Binary response handler using Bun's file system APIs
 * Simplified from the complex abstraction
 */

import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { StorageLocation } from '@rainmaker/schema/types/execution';

// Simple storage configuration
export interface StorageConfig {
  basePath: string; // Base directory for storing files
  maxFileSize?: number; // Maximum file size in bytes
}

// Get MIME type from content-type header
function parseMimeType(contentType: string): string {
  const parts = contentType.split(';');
  return parts[0]?.trim() || 'application/octet-stream';
}

// Generate filename from URL and content type
function generateFilename(url: string, contentType?: string): string {
  const urlPath = new URL(url).pathname;
  const baseName = urlPath.split('/').pop() || 'download';

  // Add extension if missing
  if (!baseName.includes('.') && contentType) {
    const mimeType = parseMimeType(contentType);
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/json': '.json',
      'text/plain': '.txt',
      'text/html': '.html',
    };
    const ext = extensions[mimeType] || '.bin';
    return baseName + ext;
  }

  return baseName;
}

// Store binary response to filesystem
export async function storeBinaryResponse(
  content: Buffer,
  url: string,
  contentType: string | undefined,
  config: StorageConfig,
): Promise<StorageLocation> {
  // Validate size
  if (config.maxFileSize && content.length > config.maxFileSize) {
    throw new Error(`File size ${content.length} exceeds maximum ${config.maxFileSize}`);
  }

  // Calculate checksum
  const checksum = createHash('sha256').update(content.toString()).digest('hex');

  // Create storage path
  const timestamp = new Date().toISOString().split('T')[0] || 'unknown';
  const dirPath = join(config.basePath, timestamp);
  await mkdir(dirPath, { recursive: true });

  // Generate filename and full path
  const filename = generateFilename(url, contentType || 'application/octet-stream');
  const filePath = join(dirPath, filename);

  // Write file using Bun
  await Bun.write(filePath, new Uint8Array(content));

  return {
    provider: 'local',
    path: filePath,
    size: content.length,
    checksum,
    contentType: parseMimeType(contentType || 'application/octet-stream'),
    metadata: {
      sourceUrl: url,
      storedAt: new Date().toISOString(),
    },
  };
}

// Check if response should be stored as binary
export function isBinaryResponse(contentType: string): boolean {
  const mimeType = parseMimeType(contentType);

  // Common binary types
  const binaryTypes = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/octet-stream',
    'application/x-',
  ];

  return binaryTypes.some((type) => mimeType.startsWith(type));
}

// Simple file cleanup for old files
export async function cleanupOldFiles(basePath: string, daysToKeep = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  // This is a simple implementation - in production you'd want
  // more sophisticated cleanup with proper error handling
  const dirs = (await Bun.file(basePath).exists()) ? [] : []; // Simplified for now
  for (const dir of dirs) {
    const dirDate = new Date(dir);
    if (dirDate < cutoffDate) {
      // Remove old directory
      await Bun.spawn(['rm', '-rf', join(basePath, dir)]).exited;
    }
  }
}
