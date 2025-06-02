# Rainmaker Repository Audit Tasks

The following tasks are derived from the style guide in `README.md` and the instructions in `AGENTS.md`. Each task has a unique ID for tracking.

## Task List

| ID | Priority | Task | Rationale |
|---|---|---|---|
| RM-T1 | High | Replace all `z.enum` usages with unions of `z.literal` values. | AGENTS.md rule forbids `z.enum`; ensures schema consistency. |
| RM-T2 | High | Remove all `any` and `unknown` types; replace with typed generics or `z.infer`-based types. | AGENTS.md rules 5-7 prohibit `any`/`unknown` and require types from Zod. |
| RM-T3 | High | Eliminate `z.ZodObject<any>` and `z.ZodSchema<any>` usages; define proper typed schemas. | Ensures strong typing and adherence to Zod rules. |
| RM-T4 | High | Update all LLM-related modules to use `@boundaryml/baml`. | AGENTS.md rule 12 mandates BoundaryML for LLM calls. |
| RM-T5 | High | Introduce `trigger.dev` for multi-step external workflows. | AGENTS.md rule 13 requires trigger.dev for such workflows. |
| RM-T6 | High | Consolidate TypeScript versions across packages to 5.8.2. | README/AGENTS specify TypeScript 5.8.2 as standard. |
| RM-T7 | High | Update Bun runtime references to version 1.2.12 in project configs. | AGENTS specifies Bun 1.2.12 as runtime. |
| RM-T8 | Medium | Remove obsolete/commented code such as `CriticalQuestionService` implementation. | Improves clarity and maintainability. |
| RM-T9 | Medium | Add missing JSDocs explaining reasoning near complex code sections. | AGENTS encourages liberal JSDoc usage for decision rationale. |
| RM-T10 | Medium | Ensure base Zod schema is JSON-serializable and other schemas inherit from it. | AGENTS rules ZOD-1 to ZOD-4. |
| RM-T11 | Medium | Use `z.infer` types consistently across the codebase for SSOT. | Aligns with Zod-based type strategy. |
| RM-T12 | Medium | Refactor validation utilities to avoid `unknown` parameters and return typed results. | Adheres to no `unknown` rule; improves type safety. |
| RM-T13 | Low | Standardize logging structure and remove duplicated logger implementations. | Enhances observability. |
| RM-T14 | Low | Provide automated script to generate Prisma models from Zod schemas. | Completes SSOT workflow. |
| RM-T15 | Low | Review test scripts to ensure `bun run` is used instead of `bun test`. | README instructs using `bun run` for tests. |

## Detailed Tasks

### RM-T1 Replace all `z.enum` usages
- **RM-T1.1** `packages/api/src/routes/anthropic.ts:44`
  - Replace with `z.union([z.literal('user'), z.literal('assistant')])`.
  - **Acceptance**: Contract schema passes tests.
  - **Exceptions**: none.
- **RM-T1.2** `packages/schema/src/__tests__/validation.test.ts:33` and `src/__tests__/validation.test.ts:33`
  - Replace enum with union of `z.literal('active') | z.literal('inactive')`.
  - **Acceptance**: Tests compile without using `z.enum`.
  - **Exceptions**: none.

### RM-T2 Remove `any` and `unknown` types
- **RM-T2.1** `packages/frontend/src/components/Refinement/MVPPrioritization.tsx:7-12`
  - Replace `any` props with typed interfaces derived from Zod schemas.
- **RM-T2.2** `packages/api/src/lib/schema-utils.ts:26` uses `data: unknown` and casts with `as any` on line 33.
  - Refactor to accept typed input and avoid casting.
- **RM-T2.3** `packages/api/src/lib/custom-error.ts:4` uses `unknown` for `cause`.
  - Use a generic type parameter or `Error` instead.
  - **Acceptance**: No `any` or `unknown` appears in source files.
  - **Exceptions**: Test mocks may use `any` where type safety is impossible.

### RM-T3 Remove `z.ZodObject<any>` and `z.ZodSchema<any>`
- **RM-T3.1** `packages/schema/src/utils/validation.ts:72-73` and `src/utils/validation.ts:72-73`
  - Provide proper generic parameters instead of `any`.
- **RM-T3.2** `packages/schema/src/types/prisma.ts:6` and line 93
  - Replace `any` with a serializable type and map of typed schemas.
- **RM-T3.3** `packages/schema/src/index.ts:9`
  - Use `Map<string, z.ZodSchema<MyBase>>` where `MyBase` is the base JSON schema.
  - **Acceptance**: All generics specify concrete types.
  - **Exceptions**: none.

### RM-T4 Migrate to `@boundaryml/baml`
- **RM-T4.1** Replace `@anthropic-ai/sdk` usage in `packages/api/src/routes/anthropic.ts` and related tests with BoundaryML equivalents.
- **RM-T4.2** Update `packages/api/src/server.ts` initialization to use BAML clients.
  - **Acceptance**: All LLM calls go through BoundaryML.
  - **Exceptions**: none.

### RM-T5 Introduce `trigger.dev`
- **RM-T5.1** Identify workflows in `packages/api/src/routes` that make multiple external calls (e.g., PRD generation).
- **RM-T5.2** Implement `trigger.dev` jobs for these flows.
  - **Acceptance**: Multi-step flows are orchestrated via trigger.dev.
  - **Exceptions**: Single-step calls remain plain functions.

### RM-T6 Consolidate TypeScript versions
- **RM-T6.1** Update TypeScript version in `package.json`, `packages/api/package.json`, `packages/frontend/package.json`, and `packages/schema/package.json` to `5.8.2`.
  - **Acceptance**: `bun install` installs TypeScript 5.8.2 everywhere.

### RM-T7 Update Bun runtime version
- **RM-T7.1** Change `packageManager` in root `package.json` and `bun` tool in `mise.toml` to `1.2.12`.
  - **Acceptance**: `bun --version` outputs 1.2.12 after setup.

### RM-T8 Remove obsolete/commented code
- **RM-T8.1** Delete commented `CriticalQuestionService` in `packages/api/src/criticalQuestionService.ts`.
  - **Acceptance**: File contains no commented-out implementation.

### RM-T9 Add missing JSDocs
- **RM-T9.1** Review `packages/api/src/routes/**/*.ts` for undocumented logic (e.g., PRD router).
- **RM-T9.2** Document reasoning inside complex React hooks such as `usePRDQuestionFlow.tsx`.
  - **Acceptance**: Nontrivial code blocks are preceded by explanatory JSDocs.

### RM-T10 Base Zod schema inheritance
- **RM-T10.1** Create a JSON-serializable base schema (e.g., `BaseSchema` in `packages/shared/src`).
- **RM-T10.2** Ensure all other schemas extend this base via `.merge`.
  - **Acceptance**: Linting verifies inheritance.

### RM-T11 Consistent `z.infer` usage
- **RM-T11.1** Replace manually defined TypeScript types in React props with `z.infer` forms from shared schemas.
  - **Acceptance**: All exported types derive from schemas.

### RM-T12 Refactor validation utilities
- **RM-T12.1** `packages/api/src/lib/schema-utils.ts` should return typed results without `unknown` parameters.
- **RM-T12.2** Similar refactor for `src/utils/validation.ts`.
  - **Acceptance**: Utility APIs expose typed generics and contain no casts.

### RM-T13 Standardize logging
- **RM-T13.1** Consolidate logger implementations found in `src/utils/logger.ts` and `packages/api/src/lib/logger.ts`.
  - **Acceptance**: Single logger module used across packages.

### RM-T14 Automate Prisma model generation
- **RM-T14.1** Provide a script in `packages/schema` that calls `generateSchema` and writes to `packages/api/prisma/schema.prisma`.
  - **Acceptance**: Running the script regenerates Prisma models from Zod schemas.

### RM-T15 Ensure `bun run` for tests
- **RM-T15.1** Verify all test commands in `package.json` use `bun run`.
  - **Acceptance**: No scripts or docs reference `bun test`.
