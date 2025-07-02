/**
 * Production Embedding Service
 * 
 * Provides high-quality vector embeddings for semantic search using OpenAI or local models.
 * This replaces the hash-based placeholder with real semantic understanding.
 */

import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

export interface EmbeddingConfig {
  provider: 'openai' | 'local';
  openaiApiKey?: string | undefined;
  model?: string;
  batchSize?: number;
  maxRetries?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export class EmbeddingService {
  private openai?: OpenAI;
  private config: Required<EmbeddingConfig>;
  
  constructor(config: EmbeddingConfig) {
    this.config = {
      provider: config.provider,
      openaiApiKey: config.openaiApiKey || process.env['OPENAI_API_KEY'] || '',
      model: config.model || 'text-embedding-3-small',
      batchSize: config.batchSize || 100,
      maxRetries: config.maxRetries || 3,
    };
    
    if (this.config.provider === 'openai') {
      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key is required for OpenAI embeddings');
      }
      
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
      });
    }
  }
  
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.config.provider === 'openai') {
      return this.generateOpenAIEmbedding(text);
    } else {
      return this.generateLocalEmbedding(text);
    }
  }
  
  /**
   * Generate embeddings for multiple texts (more efficient)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];
    
    if (this.config.provider === 'openai') {
      return this.generateOpenAIBatchEmbeddings(texts);
    } else {
      return this.generateLocalBatchEmbeddings(texts);
    }
  }
  
  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: text,
        encoding_format: 'float',
      });
      
      const data = response.data[0];
      if (!data) {
        throw new Error('No embedding data received from OpenAI');
      }
      
      return {
        embedding: data.embedding,
        tokens: response.usage?.total_tokens || 0,
        model: this.config.model,
      };
    } catch (error) {
      logger.error('Failed to generate OpenAI embedding:', error);
      throw new Error(`OpenAI embedding failed: ${error}`);
    }
  }
  
  /**
   * Generate batch embeddings using OpenAI API
   */
  private async generateOpenAIBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const results: EmbeddingResult[] = [];
    
    // Process in batches to respect API limits
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: batch,
          encoding_format: 'float',
        });
        
        const batchResults = response.data.map((data, index) => ({
          embedding: data.embedding,
          tokens: Math.round((response.usage?.total_tokens || 0) / batch.length), // Approximate tokens per text
          model: this.config.model,
        }));
        
        results.push(...batchResults);
        
        // Rate limiting - wait between batches
        if (i + this.config.batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`Failed to generate batch embeddings for batch ${i}:`, error);
        
        // Fallback to individual embeddings for this batch
        for (const text of batch) {
          try {
            const result = await this.generateOpenAIEmbedding(text);
            results.push(result);
          } catch (individualError) {
            logger.error('Failed to generate individual embedding:', individualError);
            // Use zero vector as fallback
            results.push({
              embedding: new Array(1536).fill(0), // text-embedding-3-small dimension
              tokens: 0,
              model: this.config.model,
            });
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Generate embedding using local model (placeholder for now)
   */
  private async generateLocalEmbedding(text: string): Promise<EmbeddingResult> {
    // For now, use the improved hash-based approach as fallback
    // In production, this would use sentence-transformers or similar
    logger.warn('Using fallback hash-based embedding - implement local model for production');
    
    const embedding = this.generateImprovedHashEmbedding(text);
    
    return {
      embedding,
      tokens: text.split(/\s+/).length,
      model: 'hash-fallback',
    };
  }
  
  /**
   * Generate batch embeddings using local model
   */
  private async generateLocalBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map(text => this.generateLocalEmbedding(text)));
  }
  
  /**
   * Improved hash-based embedding (better than the original)
   */
  private generateImprovedHashEmbedding(text: string): number[] {
    const dimension = 384; // Standard embedding dimension
    const embedding = new Array(dimension).fill(0);
    
    // Normalize text
    const normalizedText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = normalizedText.split(' ');
    const ngrams = this.generateNgrams(words, 2); // Use bigrams for better semantic capture
    
    // Use multiple hash functions for better distribution
    const hashFunctions = [
      this.djb2Hash,
      this.sdbmHash,
      this.fnvHash,
    ];
    
    // Process words and ngrams
    [...words, ...ngrams].forEach((token, tokenIndex) => {
      hashFunctions.forEach((hashFn, fnIndex) => {
        const hash = hashFn(token);
        const startIndex = (hash % (dimension / hashFunctions.length)) + (fnIndex * (dimension / hashFunctions.length));
        
        // Use sine and cosine for smoother distribution
        for (let i = 0; i < 8; i++) {
          const index = (startIndex + i) % dimension;
          const weight = Math.sin((hash + i) * 0.1) * Math.cos((tokenIndex + i) * 0.1);
          embedding[index] += weight;
        }
      });
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }
  
  /**
   * Generate n-grams from words
   */
  private generateNgrams(words: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
  
  /**
   * DJB2 hash function
   */
  private djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }
  
  /**
   * SDBM hash function
   */
  private sdbmHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * FNV hash function
   */
  private fnvHash(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash *= 16777619;
    }
    return Math.abs(hash);
  }
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
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
  static findSimilar(
    query: number[],
    embeddings: Array<{ id: string; embedding: number[] }>,
    topK: number = 10
  ): Array<{ id: string; score: number }> {
    const scores = embeddings.map(item => ({
      id: item.id,
      score: EmbeddingService.cosineSimilarity(query, item.embedding),
    }));
    
    // Sort by similarity score (descending)
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, topK);
  }
  
  /**
   * Get embedding dimension for the current model
   */
  getEmbeddingDimension(): number {
    if (this.config.provider === 'openai') {
      switch (this.config.model) {
        case 'text-embedding-3-small':
          return 1536;
        case 'text-embedding-3-large':
          return 3072;
        case 'text-embedding-ada-002':
          return 1536;
        default:
          return 1536;
      }
    } else {
      return 384; // Local model dimension
    }
  }
}

/**
 * Default embedding service instance
 */
export const defaultEmbeddingService = new EmbeddingService({
  provider: process.env['OPENAI_API_KEY'] ? 'openai' : 'local',
  openaiApiKey: process.env['OPENAI_API_KEY'],
});

/**
 * Convenience functions for backward compatibility
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await defaultEmbeddingService.generateEmbedding(text);
  return result.embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  return EmbeddingService.cosineSimilarity(a, b);
}

export function findSimilar(
  query: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 10
): Array<{ id: string; score: number }> {
  return EmbeddingService.findSimilar(query, embeddings, topK);
}
