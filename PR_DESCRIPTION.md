# Add ConfigSetting Component with Formal Verification

## Summary
This PR adds a new ConfigSetting component that provides type-safe, validated configuration management with formal verification through Dafny. This is a complete vertical slice implementation that cuts through all layers from database to API with formal verification using Dafny to prove critical system properties mathematically.

## Implementation Details

The implementation follows a vertical slice approach through all layers:

### Schema Layer
- Added Zod schema in `packages/schema/src/types/configSetting.ts`
- Defined validation rules and type constraints
- Supports multiple value types (string, number, boolean)

### Database Layer
- Created Prisma model in `packages/api/prisma/schema.prisma`
- Added database migration
- Implemented appropriate indexes and constraints

### Service Layer
- Implemented ConfigSettingService in `packages/api/src/config/configSettingService.ts`
- Added proper error handling and validation
- Supports JSON serialization/deserialization for non-string values

### API Layer
- Added REST endpoints in `packages/api/src/routes/config.ts`
- Integrated with the existing server setup

### Formal Verification
- Created Dafny model in `verification/configSetting.dfy`
- Added verification script in `verification/run-verification.sh`
- Formal verification ensures critical system properties

### Testing
- Added unit tests in `packages/api/src/__tests__/configSetting.test.ts`
- Tests all core functionality with proper mocking

### Documentation
- Added component README in `packages/api/src/config/README.md`
- Updated project README.md with new features

## Formal Verification

This PR introduces formal verification with Dafny, which mathematically proves that the system correctly implements key properties:

1. **Uniqueness Constraint**: The implementation correctly enforces that each configuration key must be unique. The Dafny model proves that when a key already exists, the operation fails without modifying the state.

2. **Validation Rules**: The implementation properly enforces validation rules such as non-empty keys and maximum key length. Dafny proves that invalid inputs never result in invalid states.

3. **Repository Consistency**: The Dafny model verifies that the repository state remains consistent across operations, with operations that fail leaving the repository unchanged.

Formal verification provides a level of confidence in code correctness beyond what unit testing alone can achieve, as it proves properties for all possible inputs and state transitions.

## Testing

The implementation includes comprehensive unit tests that verify:

- Creating settings with string values
- Creating settings with non-string values (boolean, number)
- Proper error handling for duplicate keys
- Proper error handling for invalid inputs
- Retrieving settings and parsing back to original types
- Null handling for non-existent settings

All tests pass with Vitest using mocked dependencies.

## Migration

This PR includes a database migration that adds the ConfigSetting table:

```sql
CREATE TABLE "ConfigSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ConfigSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfigSetting_key_key" ON "ConfigSetting"("key");
CREATE INDEX "ConfigSetting_key_idx" ON "ConfigSetting"("key");
CREATE INDEX "ConfigSetting_category_idx" ON "ConfigSetting"("category");
```

To apply this migration, run:
```bash
cd packages/api && npx prisma migrate dev
```

## Usage

After merging this PR, configuration settings can be created and retrieved as follows:

```typescript
// Create a config setting
await configService.createConfigSetting({
  key: 'app.feature.enabled',
  value: true,
  category: 'features',
  isEncrypted: false,
  version: 1
});

// Retrieve a config setting
const config = await configService.getConfigSetting('app.feature.enabled');
if (config) {
  // config.value will be a boolean value (true)
}
```

## API Endpoints

The PR adds these new API endpoints:

- `POST /api/config/settings` - Create a new config setting
- `GET /api/config/settings/:key` - Retrieve a config setting by key

## Additional Notes

- The formal verification approach can be extended to other components in the future.
- Dafny installation is optional for development but is recommended to run the verification scripts.
- This implementation serves as a foundation for future enhancements like encrypted settings, versioning, and hierarchical configuration.
