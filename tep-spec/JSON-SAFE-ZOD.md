# JSON-Safe Zod

## Overview

This package enforces compile-time JSON serializability for all Zod schemas in the codebase. Any attempt to use non-JSON-serializable types (Date, Map, Set, etc.) results in immediate compile errors with clear guidance.

## Why This Exists

1. **Trigger.dev Requirement**: All data must be JSON-serializable
2. **API Contracts**: Request/response data must be JSON
3. **State Persistence**: Stored state must serialize cleanly
4. **Early Error Detection**: Catch issues at compile time, not runtime

## How It Works

### TypeScript Path Mapping
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "zod": ["packages/schema/src/zod.ts"],
      "zod/*": ["packages/schema/src/zod.ts"]
    }
  }
}
```

All imports of 'zod' are redirected to our constrained version.

### Allowed Types
- `z.string()`
- `z.number()`
- `z.boolean()`
- `z.null()`
- `z.literal()` (string/number/boolean/null only)
- `z.object()`
- `z.array()`
- `z.record()` (string keys only)
- `z.union()`
- `z.discriminatedUnion()`
- `z.optional()`
- `z.nullable()`

### Helper Patterns
```typescript
// ISO date validation
const schema = z.object({
  createdAt: z.dateString() // Built-in ISO date pattern
});

// Numeric string validation  
const idSchema = z.object({
  numericId: z.numberString() // Validates digit-only strings
});

// UUID validation
const userSchema = z.object({
  id: z.uuid() // RFC 4122 UUID v4 validation
});

// URL validation
const profileSchema = z.object({
  website: z.url() // HTTP/HTTPS URL validation
});

// Integer validation (runtime check for whole numbers)
const configSchema = z.object({
  port: z.int().min(1).max(65535), // Only accepts integers
  retries: z.int().min(0) // Rejects 1.5, accepts 1
});
```

### Forbidden Types
These produce compile-time errors with helpful messages:
- `z.date()` → "Use z.dateString() instead"
- `z.bigint()` → "Use z.number() or z.string()"
- `z.map()` → "Use z.record()"
- `z.set()` → "Use z.array()"
- `z.any()` → "Define explicit schema"
- `z.unknown()` → "Define explicit schema"
- And others...

## Usage

```typescript
import { z } from 'zod'; // Automatically gets JSON-safe version

// ✅ Valid Schema
const UserSchema = z.object({
  id: z.string(),
  age: z.number(),
  active: z.boolean(),
  tags: z.array(z.string()),
  metadata: z.record(z.string()),
  createdAt: z.dateString(), // ISO date string
  role: z.union([z.literal('admin'), z.literal('user')])
});

// ❌ Compile Error
const BadSchema = z.object({
  created: z.date(),    // Error: Use z.dateString() instead
  data: z.unknown(),    // Error: Define explicit schema
  items: z.set()        // Error: Use z.array() instead
});
```

## Runtime Validation Helpers

For cases where you need runtime checks:

```typescript
import { assertJsonSerializable, makeJsonSafe } from '@rainmaker/schema';

// Throws if not JSON-serializable with path info
assertJsonSerializable(data); 
// Error: "Value contains non-JSON-serializable type at root.created: Date"

// Converts to JSON-safe format
const safe = makeJsonSafe(data);
// Converts: Date → ISO string, Map → object, undefined → removed
```

## Implementation Details

### Files
- `packages/schema/src/zod.ts` - Constrained Zod export
- `packages/schema/src/zod-base.ts` - Direct Zod import (avoids circular deps)
- `packages/schema/src/__tests__/json-safe-zod.test.ts` - Comprehensive tests

### Escape Hatch
If you absolutely need full Zod (rare), import from zod-base:
```typescript
import { z } from './zod-base'; // Full Zod, use with caution
```

## Migration Guide

1. **Existing Code**: No import changes needed, just fix compile errors
2. **Common Fixes**:
   - `z.date()` → `z.dateString()` 
   - `z.map()` → `z.record()`
   - `z.any()` → Define specific schema
   - `z.set()` → `z.array()` with uniqueness in business logic

## Testing

```bash
cd packages/schema
bun test json-safe-zod.test.ts
```

39 tests verify:
- All JSON-safe types work correctly
- Forbidden types produce errors
- Helper patterns validate properly
- Runtime validators work as expected