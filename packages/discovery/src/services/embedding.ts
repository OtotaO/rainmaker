/**
 * Embedding Service (Legacy)
 * 
 * This file is kept for backward compatibility.
 * New code should use embedding-service.ts instead.
 */

// Re-export from the new embedding service
export {
  generateEmbedding,
  cosineSimilarity,
  findSimilar,
  EmbeddingService,
  defaultEmbeddingService,
  type EmbeddingConfig,
  type EmbeddingResult,
} from './embedding-service';
