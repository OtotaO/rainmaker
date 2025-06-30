import { z } from '../zod';
import { generatePrismaModels } from '../generators/prisma/generator';
import type { SchemaMap } from '../types/prisma';

describe('Schema Generator', () => {
  const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
    createdAt: z.dateString(),
  });

  const PostSchema = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    authorId: z.string(),
    createdAt: z.dateString(),
  });

  const schemaMap: SchemaMap = {
    User: UserSchema,
    Post: PostSchema,
  };

  it('should generate valid Prisma schema', () => {
    const schema = generatePrismaModels(new Map(Object.entries(schemaMap)));
    
    // Basic schema structure checks
    expect(schema).toContain('model User');
    expect(schema).toContain('model Post');
    
    // Field checks for User
    expect(schema).toContain('id String @id');
    expect(schema).toContain('name String');
    expect(schema).toContain('email String @unique');
    expect(schema).toContain('age Int?');
    expect(schema).toContain('createdAt DateTime');
    
    // Field checks for Post
    expect(schema).toContain('title String');
    expect(schema).toContain('content String');
    expect(schema).toContain('authorId String');
    expect(schema).toContain('createdAt DateTime');
  });

  it('should handle optional fields correctly', () => {
    const schema = generatePrismaModels(new Map(Object.entries(schemaMap)));
    expect(schema).toContain('age Int?');
  });

  it('should handle date fields correctly', () => {
    const schema = generatePrismaModels(new Map(Object.entries(schemaMap)));
    // dateString() maps to String in Prisma since it's an ISO string
    expect(schema).toContain('createdAt DateTime');
  });

  it('should handle email fields with unique constraint', () => {
    const schema = generatePrismaModels(new Map(Object.entries(schemaMap)));
    expect(schema).toContain('email String @unique');
  });
}); 