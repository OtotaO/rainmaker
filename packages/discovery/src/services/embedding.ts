/**
 * Embedding Service
 * 
 * Generates vector embeddings for semantic search using OpenAI or local models.
 * This enables finding code by meaning, not just keywords.
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

// For now, we'll use a simple implementation
// In production, you'd want OpenAI embeddings or a local model

/**
 * Generate embedding for text
 * 
 * In production, this would use:
 * - OpenAI's text-embedding-ada-002
 * - Or a local model like Sentence-BERT
 * - Or Anthropic's upcoming embedding API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For MVP, we'll use a simple hash-based embedding
  // This is just for demonstration - replace with real embeddings
  
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0); // Standard embedding size
  
  // Simple word-based hashing (not for production!)
  words.forEach(word => {
    const hash = simpleHash(word);
    for (let i = 0; i < 384; i++) {
      embedding[i] += (hash >> (i % 32)) & 1;
    }
  });
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

/**
 * Calculate similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimension');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find most similar embeddings
 */
export function findSimilar(
  query: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 10
): Array<{ id: string; score: number }> {
  const scores = embeddings.map(item => ({
    id: item.id,
    score: cosineSimilarity(query, item.embedding),
  }));
  
  // Sort by similarity score (descending)
  scores.sort((a, b) => b.score - a.score);
  
  return scores.slice(0, topK);
}

/**
 * Simple hash function for demo purposes
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Production-ready embedding service using OpenAI
 * Uncomment and use this in production
 */
/*
import { Configuration, OpenAIApi } from 'openai';

export class EmbeddingService {
  private openai: OpenAIApi;
  
  constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: text,
      });
      
      return response.data.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: texts,
      });
      
      return response.data.data.map(item => item.embedding);
    } catch (error) {
      logger.error('Failed to generate batch embeddings:', error);
      throw error;
    }
  }
}
*/