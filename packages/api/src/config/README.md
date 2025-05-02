# ConfigSetting Component

This component provides a type-safe, validated configuration system for the Rainmaker application with formal verification.

## Features

- **Schema Validation**: Uses Zod for runtime type validation
- **Database Persistence**: Stores settings in PostgreSQL via Prisma
- **Multiple Value Types**: Supports string, number, and boolean values
- **Formal Verification**: Includes Dafny models to verify key properties

## Core Components

1. **Zod Schema**: Type definitions and validation rules
2. **Prisma Model**: Database schema and constraints
3. **TypeScript Service**: Business logic and error handling
4. **API Routes**: RESTful endpoints
5. **Dafny Verification**: Formal verification of key properties

## Usage

### Creating a Config Setting

```typescript
import { ConfigSettingService } from './config/configSettingService';

const configService = new ConfigSettingService(prisma);

// Create a string setting
await configService.createConfigSetting({
  key: 'app.name',
  value: 'Rainmaker',
  category: 'general',
  isEncrypted: false,
  version: 1
});

// Create a boolean setting
await configService.createConfigSetting({
  key: 'features.darkMode',
  value: true,
  category: 'ui',
  isEncrypted: false,
  version: 1
});

// Create a number setting
await configService.createConfigSetting({
  key: 'api.timeout',
  value: 30000,
  category: 'performance',
  isEncrypted: false,
  version: 1
});
```

### Retrieving a Config Setting

```typescript
// Get a setting
const appName = await configService.getConfigSetting('app.name');
console.log(appName.value); // 'Rainmaker' (string)

const darkMode = await configService.getConfigSetting('features.darkMode');
console.log(darkMode.value); // true (boolean)

const timeout = await configService.getConfigSetting('api.timeout');
console.log(timeout.value); // 30000 (number)
```

## API Endpoints

- **POST /api/config/settings** - Create a new config setting
- **GET /api/config/settings/:key** - Retrieve a config setting by key

## Integration with Static Configuration

The ConfigSetting component can be used alongside the existing static configuration system in `packages/api/src/config/index.ts`. A helper function `getDynamicConfig` is provided to retrieve dynamic configuration values with fallback to static defaults:

```typescript
import { getDynamicConfig } from '../config';

// Get a dynamic feature flag, defaulting to false if not configured
const isFeatureEnabled = await getDynamicConfig(
  configService, 
  'features.newFeature.enabled', 
  false
);

// Get a dynamic API timeout, defaulting to the static config value
const timeout = await getDynamicConfig(
  configService, 
  'api.timeout', 
  config.anthropic.timeout
);
```

This pattern allows for overriding static configuration with dynamic values that can be changed at runtime without code deployment.

## Formal Verification

The ConfigSetting component includes Dafny formal verification models that ensure:

1. **Uniqueness Constraint**: Each key must be unique
2. **Validation Rules**: Key must not be empty and have length <= 255
3. **Repository Consistency**: Data store operations maintain consistency

To run verification:

```bash
# Requires Dafny to be installed
cd verification
./run-verification.sh
```

## Testing

To run unit tests:

```bash
cd packages/api
bun run vitest configSetting.test.ts
