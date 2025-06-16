import { promises as fs } from 'fs';
import path from 'path';
import type { Logger } from '../types';

export interface FileScanOptions {
  /** Maximum depth to scan (default: 10) */
  maxDepth?: number;
  
  /** File extensions to include (e.g., ['.ts', '.js']) */
  extensions?: string[];
  
  /** Directories to exclude (e.g., ['node_modules', '.git']) */
  excludeDirs?: string[];
  
  /** Maximum file size in bytes to read (default: 1MB) */
  maxFileSize?: number;
  
  /** Logger instance */
  logger?: Logger;
}

const DEFAULT_EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'vendor',
  'tmp',
  'temp'
];

const DEFAULT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.go', '.java', '.cpp', '.c',
  '.rs', '.rb', '.php', '.swift',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.txt', '.env.example'
];

/**
 * Scan a directory recursively and return file contents
 */
export async function scanDirectory(
  dirPath: string,
  options: FileScanOptions = {}
): Promise<Map<string, string>> {
  const {
    maxDepth = 10,
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS,
    maxFileSize = 1024 * 1024, // 1MB
    logger
  } = options;

  const fileContents = new Map<string, string>();

  async function scanRecursive(currentPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      logger?.debug(`Max depth reached at: ${currentPath}`);
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            await scanRecursive(fullPath, depth + 1);
          } else {
            logger?.debug(`Skipping excluded directory: ${relativePath}`);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            try {
              const stats = await fs.stat(fullPath);
              if (stats.size <= maxFileSize) {
                const content = await fs.readFile(fullPath, 'utf-8');
                fileContents.set(relativePath, content);
                logger?.debug(`Scanned file: ${relativePath} (${stats.size} bytes)`);
              } else {
                logger?.debug(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
              }
            } catch (error) {
              logger?.warn(`Failed to read file ${relativePath}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      logger?.error(`Failed to scan directory ${currentPath}: ${error}`);
    }
  }

  await scanRecursive(dirPath, 0);
  logger?.info(`Scanned ${fileContents.size} files from ${dirPath}`);
  
  return fileContents;
}

/**
 * Get a summary of the repository structure
 */
export async function getRepositoryStructure(
  dirPath: string,
  options: FileScanOptions = {}
): Promise<string[]> {
  const { maxDepth = 5, excludeDirs = DEFAULT_EXCLUDE_DIRS, logger } = options;
  const structure: string[] = [];

  async function buildStructure(currentPath: string, depth: number, prefix: string): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const sortedEntries = entries.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const isLast = i === sortedEntries.length - 1;
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
          continue;
        }

        const connector = isLast ? '└── ' : '├── ';
        structure.push(prefix + connector + entry.name);

        if (entry.isDirectory()) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          await buildStructure(fullPath, depth + 1, newPrefix);
        }
      }
    } catch (error) {
      logger?.warn(`Failed to read directory structure at ${currentPath}: ${error}`);
    }
  }

  structure.push(path.basename(dirPath));
  await buildStructure(dirPath, 1, '');
  
  return structure;
}

/**
 * Read a single file safely
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

/**
 * Write content to a file, creating directories as needed
 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Delete a file safely
 */
export async function deleteFileSafe(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
