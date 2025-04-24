# Issues Tracker

This document tracks specific issues and their current status in the Rainmaker Schema package.

## Module System Issues

### Issue #1: Module System Inconsistency
- **Description**: The project uses both ESM and CommonJS module systems, causing compatibility issues
- **Location**: `packages/schema/src/types/prisma.ts`
- **Current Status**: In Progress
- **Priority**: High
- **Impact**: Affects type imports and exports across the codebase
- **Related Files**:
  - `tsconfig.json`
  - `tsconfig.test.json`
  - `jest.config.js`

### Technical Details
- Main TypeScript config uses ESNext modules
- Test environment uses CommonJS
- `verbatimModuleSyntax` enabled in main config
- Type exports require special handling in CommonJS

### Proposed Solutions
1. Standardize on ESM throughout the project
2. Add proper type exports for CommonJS
3. Update test configuration to match main config

## Type Safety Issues

### Issue #2: Zod Type References
- **Description**: Zod types not properly recognized in CommonJS environment
- **Location**: `packages/schema/src/types/prisma.ts`
- **Current Status**: In Progress
- **Priority**: Medium
- **Impact**: May affect type checking and validation

### Technical Details
- Zod types need special handling in CommonJS
- Type assertions currently required
- May affect type inference

### Proposed Solutions
1. Update Zod import strategy
2. Add proper type declarations
3. Improve type inference

## Test Environment Issues

### Issue #3: Test Configuration
- **Description**: Test environment uses different module system than main
- **Location**: `packages/schema/jest.config.js`
- **Current Status**: In Progress
- **Priority**: Medium
- **Impact**: May cause inconsistencies in test results

### Technical Details
- Jest configuration needs updating
- Module system mismatch
- Test imports may not match production

### Proposed Solutions
1. Update Jest configuration
2. Align test imports with production
3. Add proper test environment setup

## Documentation Issues

### Issue #4: Documentation Gaps
- **Description**: Missing comprehensive documentation
- **Location**: Various files
- **Current Status**: In Progress
- **Priority**: Medium
- **Impact**: May affect developer experience

### Technical Details
- Need API documentation
- Usage examples required
- Type documentation needed

### Proposed Solutions
1. Add JSDoc comments
2. Create usage examples
3. Document type system 