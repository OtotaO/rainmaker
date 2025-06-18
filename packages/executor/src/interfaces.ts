import type { ApiCatalogEntry } from './schemas';

// Storage Provider Interface
export interface SaveResult {
  id: string;
  checksum: string;
  size: number;
  path: string;
}

export interface SaveOperation {
  collection: string;
  id: string;
  data: Buffer;
}

export interface LoadOperation {
  collection: string;
  id: string;
}

export interface LoadResult {
  data: Buffer;
  metadata: Record<string, string>;
}

export interface StorageProvider {
  save(collection: string, id: string, data: Buffer): Promise<SaveResult>;
  load(
    collection: string,
    id: string,
  ): Promise<{ data: Buffer; metadata: Record<string, string> } | null>;
  exists(collection: string, id: string): Promise<boolean>;
  list(collection: string, prefix?: string): Promise<string[]>;
  delete(collection: string, id: string): Promise<boolean>;
  saveBatch(operations: SaveOperation[]): Promise<SaveResult[]>;
  loadBatch(operations: LoadOperation[]): Promise<(LoadResult | null)[]>;
}

// API Catalog Interface (Stub)
export interface ApiCatalog {
  getApiEntry(apiId: string): Promise<ApiCatalogEntry | null>;
  getAllApis(): Promise<string[]>;
  // Note: Real implementation injected at runtime
}
