# Rainmaker Schema

A powerful schema generation and validation package for the Rainmaker project, providing seamless conversion between Zod schemas and Prisma models.

## Overview

This package provides utilities for generating and validating schemas, with a focus on type safety and developer experience. It enables automatic conversion of Zod schemas to Prisma models while maintaining type safety and validation rules.

## Features

- 🚀 Automatic Prisma schema generation from Zod schemas
- 🔒 Type-safe field definitions and validations
- 🎯 Support for common Prisma field attributes:
  - `@id` for primary keys
  - `@unique` for unique constraints
  - `@default` for default values
  - `@updatedAt` for timestamp fields
  - `@index` for indexed fields
- 📝 Comprehensive error handling with detailed messages
- 📊 Configurable logging with different log levels
- ✅ Extensive test coverage
- 🔄 Support for both ESM and CommonJS modules

## Installation

```bash
npm install @rainmaker/schema
```

## Usage

```typescript
import { z } from 'zod';
import { generatePrismaModels } from '@rainmaker/schema';

// Define your Zod schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  createdAt: z.date(),
});

// Generate Prisma schema
const schemaMap = new Map([['User', UserSchema]]);
const prismaSchema = generatePrismaModels(schemaMap);

// Output:
// model User {
//   id String @id
//   name String
//   email String @unique
//   age Int?
//   createdAt DateTime
// }
```

### Configuration Options

```typescript
const options = {
  logLevel: 'info', // 'error' | 'warn' | 'info' | 'debug'
  outputPath: './schema.prisma',
  validateSchema: true,
  validateRelations: true,
  defaultSchema: 'public'
};

const prismaSchema = generatePrismaModels(schemaMap, options);
```

## Development

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Building

```bash
# Build the package
npm run build

# Build in watch mode
npm run dev
```

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Track notable changes and version history
- [ISSUES.md](./ISSUES.md) - Detailed tracking of current issues and their status

## Contributing

Please refer to the [CHANGELOG.md](./CHANGELOG.md) for recent changes and [ISSUES.md](./ISSUES.md) for current issues when contributing.

## License

MIT 