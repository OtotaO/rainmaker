/**
 * Pattern Registry
 * Central registry of all available code patterns
 */

import { pattern as authJwtExpress } from './auth-jwt-express';
import { pattern as paymentStripe } from './payment-stripe';

// Pattern type definition
export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  code: string;
  dependencies: Record<string, string>;
  customization: {
    variables: Array<{
      name: string;
      type: string;
      description: string;
      defaultValue?: string;
    }>;
    injectionPoints: Array<{
      id: string;
      description: string;
      type: 'before' | 'after' | 'replace' | 'wrap';
      location: string;
    }>;
    patterns: Array<{
      type: string;
      current: string;
      description: string;
    }>;
  };
}

// Pattern registry
export const patterns: Record<string, Pattern> = {
  'auth-jwt-express': authJwtExpress,
  'payment-stripe': paymentStripe,
};

// Helper functions
export function getPattern(id: string): Pattern | undefined {
  return patterns[id];
}

export function listPatterns(): Array<{ id: string; name: string; category: string; description: string }> {
  return Object.values(patterns).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
  }));
}

export function searchPatterns(query: string): Pattern[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(patterns).filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    p.category.toLowerCase().includes(lowerQuery)
  );
}

export function getPatternsByCategory(category: string): Pattern[] {
  return Object.values(patterns).filter(p => p.category === category);
}

export function getCategories(): string[] {
  const categories = new Set(Object.values(patterns).map(p => p.category));
  return Array.from(categories);
}
