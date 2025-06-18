# RETROSPECTIVE: Action Executor Module Implementation Issues

## TSANY-001: REPOSITORY BAN ON `any` AND `unknown` TYPES

**Issue**: Initially used `any` and `unknown` types throughout the implementation, which violates the repository's strict typing requirements.

**Time Spent**: ~30 minutes discovering and understanding the requirement, then ~2 hours systematically replacing all instances.

**Root Cause**: Started implementation without fully understanding the codebase's architectural constraints that require all types to be defined via Zod schemas.

**Solution**: 
- Define all data structures as Zod schemas first
- Use `z.infer<typeof Schema>` for TypeScript types
- Use `parse()` or `safeParse()` for runtime validation

**Recommendation**: Add to rules:
```
When implementing any data structure:
1. ALWAYS define the Zod schema first
2. NEVER use `any` or `unknown` types
3. Use schema.parse() for runtime validation
4. For circular references, use z.lazy() or TypeScript interfaces with z.ZodType
```

---

## TRIGGER-001: TESTING TRIGGER.DEV JOBS INCOMPATIBILITY

**Issue**: Attempted to use @trigger.dev/testing package with Bun test runner, resulting in `spyOn` compatibility errors.

**Time Spent**: ~45 minutes trying different approaches before realizing the fundamental incompatibility.

**Root Cause**: @trigger.dev/testing expects Jest or Vitest mocking APIs that aren't fully compatible with Bun's implementation.

**Solution**: 
- Extract job logic into standalone functions
- Test the functions directly rather than the Trigger.dev job wrapper
- Create adapter between Trigger.dev's IO object and our simplified interface

**Recommendation**: Add to rules:
```
When implementing Trigger.dev jobs:
1. ALWAYS extract core logic into testable functions
2. Create type-safe adapters for the IO object
3. Test the extracted functions, not the job wrapper
4. Don't rely on @trigger.dev/testing with Bun
```

---

## AXIOS-001: `InternalAxiosRequestConfig` TYPE MISMATCH

**Issue**: TypeScript error when assigning `AxiosRequestConfig` to parameters expecting `InternalAxiosRequestConfig`, specifically around headers being potentially undefined.

**Time Spent**: ~30 minutes researching and trying different solutions.

**Root Cause**: Axios uses `InternalAxiosRequestConfig` internally where headers are guaranteed to exist, while `AxiosRequestConfig` has optional headers.

**Solution**:
- Import and use `InternalAxiosRequestConfig` for internal axios operations
- Ensure headers are initialized before passing config
- Use type assertions sparingly and only when necessary

**Recommendation**: Add to rules:
```
When working with Axios in TypeScript:
1. Understand the difference between AxiosRequestConfig and InternalAxiosRequestConfig
2. Always initialize headers when creating configs: config.headers = config.headers || {}
3. Use InternalAxiosRequestConfig for axios internals
```

---

## BRANDED-001: INCORRECT MANUAL TYPE CASTING FOR BRANDED TYPES

**Issue**: Initially used manual type casting (`as ActionId`) for Zod branded types instead of using schema validation.

**Time Spent**: ~20 minutes realizing the mistake and fixing all instances.

**Root Cause**: Attempted to bypass Zod's runtime validation by using TypeScript type assertions.

**Solution**:
- Use `ActionIdSchema.parse()` or `safeParse()` to create branded types
- Never manually cast to branded types
- Let Zod handle both runtime validation and type branding

**Recommendation**: Add to rules:
```
For Zod branded types:
1. NEVER use manual type casting (as BrandedType)
2. ALWAYS use Schema.parse() to create branded values
3. This ensures runtime validation along with type safety
```

---

## JSONSCHEMA-001: CIRCULAR REFERENCE IN TYPE DEFINITIONS

**Issue**: Creating a Zod schema for JSON Schema resulted in circular reference errors due to self-referential properties.

**Time Spent**: ~40 minutes trying different approaches.

**Root Cause**: JSON Schema allows properties to reference the schema type itself (nested schemas).

**Solution**:
- Define TypeScript interface first for the circular structure
- Use `z.ZodType<Interface>` with `z.lazy()` for the Zod schema
- Separate type definition from validation logic

**Recommendation**: Add to rules:
```
For circular/recursive data structures:
1. Define TypeScript interface first
2. Use z.ZodType<Interface> = z.lazy(() => ...) pattern
3. Don't try to infer types from circular Zod schemas
```

---

## UNION-001: DISCRIMINATED UNIONS AND TYPE NARROWING

**Issue**: TypeScript couldn't narrow union types properly in test assertions, requiring verbose type guards.

**Time Spent**: ~25 minutes adding type guards throughout test files.

**Root Cause**: TypeScript's type narrowing doesn't work through optional chaining with discriminated unions.

**Solution**:
- Use explicit type guards: `if (result.result?.status === 'failure')`
- Access properties only after narrowing the type
- Avoid complex boolean expressions for type narrowing

**Recommendation**: Add to rules:
```
When working with discriminated unions:
1. Use explicit if statements for type narrowing
2. Don't rely on && operators for type guards
3. Access union-specific properties only after narrowing
```

---

## SCHEMA-001: JSON SCHEMA STRING STORAGE FORMAT

**Issue**: Test data defined JSON schemas as objects, but the schema expected them as `Record<string, string>`.

**Time Spent**: ~15 minutes understanding the schema format requirement.

**Root Cause**: The action definition schema stores JSON schemas as string key-value pairs rather than nested objects.

**Solution**:
- Serialize nested properties as JSON strings
- Understand the storage format before creating test data

**Recommendation**: Add to rules:
```
When defining schemas for external formats:
1. Check how the schema is actually stored/transmitted
2. JSON schemas might be stored as strings, not objects
3. Validate test data matches the expected format
```

---

## ENUM-001: ZOD ENUM TYPE CONSTRAINTS

**Issue**: Zod's `z.enum()` requires at least two values and specific tuple types, causing issues with dynamic enum creation.

**Time Spent**: ~30 minutes fixing enum handling in validation.ts.

**Root Cause**: Attempting to dynamically create enums from JSON Schema without considering Zod's type constraints.

**Solution**:
- Filter enum values by type first
- Handle single-value cases with `z.literal()`
- Use proper tuple destructuring for multi-value enums

**Recommendation**: Add to rules:
```
When creating Zod enums dynamically:
1. Filter values by type (string, number, etc.)
2. Use z.literal() for single values
3. Use [first, second, ...rest] pattern for z.enum()
4. Ensure at least 2 values for z.enum()
```

---

## PARTIAL-001: OPTIONAL PROPERTIES IN STRICT TYPES

**Issue**: TypeScript complained about undefined values in Record types when using optional object properties.

**Time Spent**: ~20 minutes fixing test data structures.

**Root Cause**: `Record<string, T>` doesn't allow undefined values, but optional properties can be undefined.

**Solution**:
- Use explicit type annotations for test data
- Avoid mixing optional and required properties in unions
- Consider using `Partial<>` or more specific types

**Recommendation**: Add to rules:
```
When using Record types:
1. Remember Record<string, T> requires all values to be T (not undefined)
2. Optional properties create type conflicts with Record
3. Use explicit interfaces or Partial types when needed
```

---

## Key Takeaways for Future Development:

1. **Always understand the codebase's architectural constraints first** - especially around type systems and testing approaches
2. **Zod-first development means Zod schemas define everything** - types, validation, and runtime behavior
3. **Test framework compatibility matters** - ensure testing approaches work with the chosen test runner
4. **Type narrowing requires explicit patterns** - TypeScript won't always infer what seems obvious
5. **Read the actual schema definitions** - don't assume data formats based on logical structure