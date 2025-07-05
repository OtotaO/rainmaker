# Migration Guide: From Code Generation to Pattern Composition

## Overview

This guide helps you migrate from Rainmaker Discovery V1 (code generation) to V2 (pattern composition).

## Key Differences

### V1: Code Generation
```typescript
// Old: Generate code from templates
rainmaker adapt auth-jwt-express \
  --naming camelCase \
  --error-handling async-await \
  --output ./src/auth.ts
```

### V2: Pattern Composition
```typescript
// New: Compose patterns with configuration
rainmaker create api my-app
// Select patterns interactively
// Configure via environment variables
// No code generation!
```

## Migration Steps

### 1. Understanding the Change

**Before (V1):**
- Patterns were code templates
- AST transformation modified code
- Output was generated files
- Customization through code transformation

**After (V2):**
- Patterns are configurable modules
- No code transformation
- Output is composition + config
- Customization through runtime configuration

### 2. Pattern Migration

If you have custom patterns in V1 format, here's how to convert them:

#### V1 Pattern Structure
```typescript
export const pattern = {
  id: 'auth-jwt-express',
  code: `
    // Template code with placeholders
    const config = {
      tokenExpiry: '{{tokenExpiry}}'
    };
  `,
  customization: {
    variables: [...],
    patterns: [...]
  }
};
```

#### V2 Pattern Structure
```typescript
export const authJwtV2: PatternV2 = {
  id: 'auth-jwt-v2',
  factory: (config) => new JWTAuthModule(config),
  configSchema: {
    required: {
      tokenExpiry: { type: 'string', default: '15m' }
    }
  }
};

class JWTAuthModule implements PatternModule {
  constructor(private config: Config) {}
  // Actual implementation, not template
}
```

### 3. Application Migration

#### Step 1: Identify Your Patterns
List all the patterns you're currently using:
```bash
# In your V1 project
grep -r "rainmaker adapt" .
```

#### Step 2: Create Composition File
Create `app.composition.json`:
```json
{
  "name": "my-app",
  "patterns": [
    {
      "patternId": "auth-jwt-v2",
      "instanceId": "auth",
      "config": {
        "accessTokenSecret": "${JWT_ACCESS_SECRET}",
        "refreshTokenSecret": "${JWT_REFRESH_SECRET}"
      }
    }
  ]
}
```

#### Step 3: Update Your Server
Replace generated code with composition:

**Before:**
```typescript
// Generated auth code
import { authenticate } from './generated/auth';
app.use('/api', authenticate);
```

**After:**
```typescript
// Composed patterns
const composer = new PatternComposer();
const app = await composer.compose(composition);
const auth = app.instances.get('auth');
app.use('/api', auth.middleware);
```

### 4. Configuration Migration

#### V1: Build-time Configuration
```typescript
// Variables baked into generated code
const TOKEN_EXPIRY = '15m'; // Hard-coded
```

#### V2: Runtime Configuration
```typescript
// Environment variables
JWT_TOKEN_EXPIRY=15m
```

### 5. Testing Migration

#### V1: Test Generated Code
```typescript
// Test the generated files
import { authenticate } from './generated/auth';
test('auth works', () => {
  // Test generated code
});
```

#### V2: Test Composed Patterns
```typescript
// Test the composition
const app = await composer.compose(testComposition);
const auth = app.instances.get('auth');
test('auth works', () => {
  // Test actual module
});
```

## Common Migration Scenarios

### Scenario 1: Simple Auth Migration

**V1 Approach:**
```bash
rainmaker adapt auth-jwt-express -o ./src/auth.ts
# Manually integrate generated code
```

**V2 Approach:**
```bash
rainmaker create api my-app
# Select auth-jwt-v2 pattern
# Configure via .env
# Run immediately
```

### Scenario 2: Multi-Pattern Application

**V1 Approach:**
```bash
# Generate each pattern separately
rainmaker adapt auth-jwt-express -o ./src/auth.ts
rainmaker adapt payment-stripe -o ./src/payment.ts
# Manually wire them together
```

**V2 Approach:**
```json
{
  "patterns": [
    { "patternId": "auth-jwt-v2", "config": {...} },
    { "patternId": "payment-stripe-v2", "config": {...} }
  ]
}
```

### Scenario 3: Custom Patterns

**V1:** Write template with placeholders
**V2:** Write actual module with config interface

## Benefits After Migration

1. **No More Generation Bugs**: Code that works stays working
2. **Easier Updates**: Update pattern version, not regenerate
3. **Better Testing**: Test real code, not templates
4. **Cleaner Codebase**: No generated files to maintain
5. **Faster Development**: Instant composition

## Troubleshooting

### Issue: "Pattern not found"
**Solution:** Check pattern ID ends with `-v2` for new patterns

### Issue: "Configuration invalid"
**Solution:** Check required fields in pattern schema

### Issue: "Module not found"
**Solution:** Run `npm install` to get pattern dependencies

## Rollback Plan

If you need to rollback:
1. Keep your V1 generated files
2. V1 and V2 can coexist
3. Migrate one pattern at a time
4. Test thoroughly before removing V1 code

## Getting Help

- Read `CARMACK_APPROACH.md` for philosophy
- Check `IMPLEMENTATION_ROADMAP.md` for timeline
- Join Discord for community support
- File issues on GitHub

## Conclusion

Migration from V1 to V2 is a paradigm shift from code generation to pattern composition. While it requires rethinking how you build applications, the benefits in reliability, speed, and maintainability make it worthwhile.

Remember: **The best code is no code. The second best is code that already works.**
