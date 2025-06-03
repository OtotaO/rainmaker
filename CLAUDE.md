# CLAUDE.md

This file provides comprehensive guidance to AI assistants (claude.ai/code, GitHub Copilot, etc.) when working with code in this repository.

<objective-analysis-of-current-situation>
We're building Rainmaker - a system that accelerates feature development from idea to code. The fundamental challenge isn't writing code - it's maintaining clarity while dealing with the inherent complexity of multi-stage workflows, LLM integrations, and type safety across a distributed system.

The codebase reflects several pragmatic decisions: Bun for performance, Zod for type-safety, and a monorepo structure to enforce consistency. These aren't arbitrary choices - they're optimizations for developer velocity and system comprehensibility.
</objective-analysis-of-current-situation>

<carmack-internal-monologue>
Looking at this codebase, I see the classic tension between abstraction and clarity. The vertical slice architecture makes sense - features cut through all layers, reducing the cognitive overhead of tracking state changes across disconnected modules.

The emphasis on Zod schemas as the single source of truth is critical. Too many projects let their type definitions drift from their runtime validation, creating a false sense of security. By deriving everything from Zod, we're enforcing a discipline that pays dividends in reduced debugging time.

The ban on `any` and `unknown` types might seem draconian, but it's addressing a real problem: lazy typing creates debt that compounds exponentially. Every `any` is a future bug waiting to happen when someone refactors without understanding the implicit contracts.

BoundaryML and trigger.dev aren't just tool choices - they're architectural decisions about where complexity should live. By pushing LLM management and workflow orchestration to specialized systems, we keep the core application logic clean and testable.
</carmack-internal-monologue>

<carmack-reverse-cot>
Let me challenge these assumptions:

1. "Zod as single source of truth" - YES. The alternative is maintaining parallel type systems that inevitably drift.
2. "No any/unknown types" - YES. The short-term convenience never justifies the long-term maintenance burden.
3. "Vertical slice architecture" - YES. Cross-cutting concerns are easier to reason about when colocated.
4. "BoundaryML for all LLM calls" - YES. Centralizing prompt management prevents the chaos of inline prompts.
5. "trigger.dev for workflows" - YES. State machines need proper orchestration, not ad-hoc implementations.
</carmack-reverse-cot>

## Architecture & Development Philosophy

Software development isn't about following absolute rules, but understanding tradeoffs. This codebase prioritizes:

1. **Comprehensibility over cleverness** - Explicit, sequential code that reveals its intent
2. **Type safety as documentation** - Types aren't just for the compiler; they're for humans
3. **Vertical integration** - Features own their full stack, reducing cognitive fragmentation

For this internal release, we explicitly defer:
- [NO] Performance optimization - Get it working correctly first
- [NO] Security hardening - Separate dedicated pass after core functionality stabilizes

## Commands

### Development
```bash
bun run dev          # Start API (port 3001) and frontend (port 3000)
bun run build        # Build all packages
bun run db:reset     # Reset and seed database (run from packages/api)
```

### Testing
```bash
bun run test         # Run all tests (uses configured test runners, NOT bun test)
bun run test:watch   # Run tests in watch mode
bun run test:coverage # Run tests with coverage

# Single test file (from package directory):
cd packages/<package> && bun test <path-to-test-file>
```

### Code Quality
```bash
bun run lint         # Run Biome linter
bun run check        # Check code formatting
bun run format       # Auto-format code with Biome
bun run typecheck    # Run TypeScript type checking
```

### Database
```bash
docker compose up -d              # Start PostgreSQL
cd packages/api && bun run db:push       # Run migrations
cd packages/api && bun run db:generate   # Generate Prisma client
```

## Technology Stack

- **Runtime**: Bun v1.2.15
- **Language**: TypeScript 5.8.3
- **Testing**: Vitest (API/Frontend), Jest (Schema)
- **Formal Verification**: Dafny: verifies only _possible_ workflow transitions. This reduces possible states by 99.99%+ which makes it possible for us to formally verify _all_ of our workflow transitions, meaning the entire application can be formally verified at compile time
- **Code Quality**: Biome for linting/formatting
- **Validation**: Zod schemas (single source of truth)
- **Backend**: Hono + Prisma + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS + Radix UI

- **AI**: Anthropic Claude API (migrating to BoundaryML)
- **Workflows**: trigger.dev for multi-step processes



## Critical Development Rules

### 1. Zod-First Development

Every data structure flows from Zod schemas. This isn't just validation - it's our type system:

```typescript
// ✅ CORRECT: Define schema first
const UserSchema = z.object({
  id: z.string(),
  status: z.literal('active').or(z.literal('inactive')), // Never z.enum()
  metadata: z.record(z.string(), z.unknown()) // Even dynamic data has structure
});

// Types are derived, never defined manually
type User = z.infer<typeof UserSchema>;
```

**Zod Rules**:
- ZOD-1: Base schema must be JSON-serializable - all schemas inherit from this
- ZOD-2: Only use: string, number, boolean, object, array, union, discriminated union
- ZOD-3: Nested structures must recursively follow ZOD-2
- ZOD-4: Default to Zod for all data definitions
- ZOD-5: Use `z.describe()` for documentation
- ZOD-6: Meaningful entity names (e.g., `CommentSchema` not `commentsSchema`)
- ZOD-7: Use `z.literal().or(z.literal())` instead of `z.enum()`

### 2. Type Safety Without Compromise

```typescript
// ❌ FORBIDDEN
function processData(data: any) { }
function handleError(error: unknown) { }
type Schema = z.ZodObject<any>;

// ✅ CORRECT
function processData<T extends z.ZodSchema>(
  schema: T,
  data: z.infer<T>
) { }
```

### 3. Vertical Slice Architecture

Features own their entire stack:

```
packages/
  api/src/features/prd/
    ├── prd.router.ts      # API endpoints
    ├── prd.service.ts     # Business logic
    ├── prd.repository.ts  # Data access
    └── prd.schema.ts      # Zod schemas
  
  frontend/src/features/prd/
    ├── PRDForm.tsx        # UI components
    ├── usePRD.ts          # React hooks
    └── prd.api.ts         # API client
```

### 4. Documentation Close to Code

```typescript
function calculatePriority(tasks: Task[]) {
  // Scoring based on user impact rather than technical complexity
  // because users don't care about our implementation challenges
  const scores = tasks.map(task => {
    // High-impact tasks get exponential weighting to force focus
    return task.userImpact ** 2 * task.feasibility;
  });
  
  return scores;
}
```

### 5. External Service Integration

**LLM Calls**: Always use BoundaryML
```typescript
// ❌ WRONG: Direct API calls
const response = await anthropic.complete({...});

// ✅ CORRECT: BoundaryML abstraction
import { generatePRD } from '@/baml/functions';
const response = await generatePRD({ context });
```

**Multi-Step Workflows**: Always use trigger.dev
```typescript
// ❌ WRONG: Ad-hoc orchestration
async function createFeature() {
  await generatePRD();
  await createTasks();
  await notifyTeam();
}

// ✅ CORRECT: Proper workflow management
export const createFeatureWorkflow = trigger.define({
  id: "create-feature",
  // Declarative workflow with automatic retry, observability
});
```

## Project Structure

```
rainmaker/
├── packages/
│   ├── api/              # Hono backend with Express compatibility
│   ├── frontend/         # React 18 + Vite
│   ├── schema/           # Zod schemas (source of truth)
│   └── shared/           # Shared utilities
├── verification/         # Dafny formal proofs
└── [config files]        # Biome, TypeScript, etc.
```

## Testing Philosophy

Tests should verify behavior, not implementation:

```typescript
// Focus on user-visible outcomes
test('PRD generation includes all required sections', async () => {
  const result = await generatePRD(validInput);
  expect(result).toMatchSchema(PRDSchema);
  expect(result.sections).toContain('problem');
  expect(result.sections).toContain('solution');
});
```

## Common Patterns

### Schema Composition
```typescript
const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  role: z.literal('admin').or(z.literal('user'))
});
```

### Error Handling
```typescript
// Wrap external calls with proper error boundaries
export async function safeLLMCall<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log for debugging but don't crash the user experience
    logger.error('LLM call failed', { error });
    return fallback;
  }
}
```

### State Management
```typescript
// Finite state machines for complex flows
const WorkflowStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('idle') }),
  z.object({ status: z.literal('generating'), progress: z.number() }),
  z.object({ status: z.literal('complete'), result: PRDSchema }),
  z.object({ status: z.literal('error'), message: z.string() })
]);
```

## Performance Considerations (Deferred)

While we're not optimizing for performance in this phase, keep these principles in mind:
- Bun's native implementations are fast - use them
- Streaming responses for large LLM outputs
- Database queries should use proper indexes (even if not optimized yet)

## Security Considerations (Deferred)

Security will be addressed in a dedicated pass, but maintain these hygiene practices:
- Never commit secrets (use environment variables)
- Validate all external inputs with Zod
- Use prepared statements for database queries

## Migration Notes

Current migrations in progress:
1. TypeScript 5.8.2 consolidation across all packages
2. Bun runtime update to 1.2.12
3. Anthropic SDK → BoundaryML
4. Ad-hoc workflows → trigger.dev

## Remember

Every architectural decision is a compromise between competing design goals. Our north star is simple: Can a developer understand what's happening without extensive archaeology? If the answer is no, we've failed - regardless of how clever the solution might be.

Technical debt isn't just about code complexity - it's about cognitive load. Each abstraction, each indirection, each clever optimization carries a hidden cost in developer understanding and system predictability.

Our goal isn't perfect code, but comprehensible systems that evolve gracefully.
