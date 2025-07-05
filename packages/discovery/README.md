# 🚀 Rainmaker Discovery

**Build production-ready applications from proven patterns in seconds.**

Rainmaker Discovery is a revolutionary tool that lets you compose applications from battle-tested, production-proven code patterns instead of generating new code from scratch. Think of it as "npm for application patterns" - each pattern is a complete, working implementation that you can adapt to your specific needs.

## Why Rainmaker?

- **Proven Code**: Every pattern comes from real production systems, not AI hallucinations
- **Instant Adaptation**: Transform patterns to match your coding style in seconds
- **Composable**: Patterns are designed to work together seamlessly
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Zero Magic**: See exactly what code you're getting - no black boxes

## Quick Start

```bash
# Install dependencies
cd packages/discovery
bun install

# Run the CLI
bun run cli

# Or use directly
bun run src/cli.ts
```

## Available Commands

### List all patterns
```bash
rainmaker list
```

### Search for patterns
```bash
rainmaker search auth
rainmaker search payment
```

### Show pattern details
```bash
rainmaker show auth-jwt-express
```

### Adapt a pattern to your project
```bash
# Basic usage
rainmaker adapt auth-jwt-express -o ./src/auth.ts

# With options
rainmaker adapt auth-jwt-express \
  --naming camelCase \
  --error-handling async-await \
  --output ./src/auth.ts

# Interactive mode
rainmaker adapt auth-jwt-express -i
```

## Current Patterns

### Authentication
- `auth-jwt-express` - JWT authentication with refresh tokens for Express

### Payments
- `payment-stripe` - Complete Stripe integration with checkout and subscriptions

### More patterns coming soon!
- `storage-s3` - S3 file upload with presigned URLs
- `cache-redis` - Redis caching layer with TTL
- `queue-bull` - Background job processing
- `email-sendgrid` - Transactional email sending
- `search-elasticsearch` - Full-text search
- `websocket-socketio` - Real-time connections
- `rate-limit-express` - API rate limiting
- `oauth-google` - Google OAuth flow

## How It Works

1. **Choose a Pattern**: Browse our curated library of production-tested patterns
2. **Customize**: Adapt the pattern to your coding style and requirements
3. **Integrate**: Drop the generated code into your project
4. **Ship**: You just saved hours of development time

## Pattern Adaptation

Rainmaker can adapt patterns to match your project's conventions:

### Naming Conventions
- `camelCase` (default)
- `snake_case`
- `kebab-case`
- `PascalCase`

### Error Handling Styles
- `async-await` (default)
- `try-catch`
- `promises`

### Custom Variables
Each pattern exposes configuration variables you can customize during adaptation.

## Example: Adding JWT Auth to Your App

```bash
# 1. See what's available
rainmaker show auth-jwt-express

# 2. Adapt it to your style
rainmaker adapt auth-jwt-express -i

# 3. Follow the interactive prompts
# - Choose naming convention
# - Set token expiry times
# - Configure other options

# 4. Integrate the generated code
# The CLI will show you exactly how to use it
```

## The Vision

Today, Rainmaker helps you add individual patterns to your project. Tomorrow, it will compose entire applications:

```bash
# Coming soon!
rainmaker create saas-app my-startup \
  --auth clerk \
  --payments stripe \
  --database postgres \
  --hosting vercel
```

This will generate a complete, production-ready SaaS application with:
- Authentication flows
- Subscription billing
- Admin dashboard
- API with rate limiting
- Responsive UI
- Deployment configuration

All from proven patterns that work together seamlessly.

## Contributing

Want to add your own patterns? We'd love to have them! Each pattern should be:
- Production-tested
- Well-documented
- Configurable
- Framework-agnostic (where possible)

## Philosophy

> "The best code is code you don't have to write. The second best is code someone else already debugged."

Rainmaker embraces this truth. Instead of generating code that might work, we give you code that definitely works - because it's already running in production somewhere.

## License

MIT

---

Built with ❤️ by developers who are tired of reimplementing the same patterns over and over.
