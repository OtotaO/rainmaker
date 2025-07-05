# Rainmaker Discovery

> **Build production-ready applications from proven patterns in seconds**

Rainmaker Discovery is a revolutionary tool that lets you compose applications from battle-tested, production-proven code patterns instead of generating new code from scratch. Think of it as "npm for application patterns" - each pattern is a complete, working implementation that you can adapt to your specific needs.

## ✨ What's New: Pattern-Based Development

Instead of searching for code to copy or generating code that might work, Rainmaker Discovery provides:

- 🚀 **Production-tested patterns** - JWT auth, Stripe payments, and more
- 🔧 **Instant adaptation** - Transform patterns to match your coding style
- 📦 **Zero configuration** - Works offline, no API keys needed
- 🎯 **Type-safe throughout** - Full TypeScript support
- ⚡ **30-second integration** - From zero to working feature

## 🎯 Current Status

### ✅ MVP Complete - Core Pattern System
- **Pattern Library**: JWT Authentication, Stripe Payments (more coming)
- **AST Transformations**: Naming conventions, error handling patterns
- **CLI Interface**: Beautiful, interactive command-line tool
- **Code Adaptation**: Customize patterns to match your project
- **Production Ready**: Generate working code instantly

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/OtotaO/rainmaker.git
cd rainmaker/packages/discovery
bun install

# See available patterns
bun run cli list

# Search for what you need
bun run cli search auth

# Adapt a pattern (interactive mode)
bun run cli adapt auth-jwt-express -i
```

## 🧪 Try It Now

```bash
# Add JWT authentication to your Express app in 30 seconds
cd packages/discovery
bun run cli adapt auth-jwt-express --output ./auth.ts

# Or use interactive mode for customization
bun run cli adapt auth-jwt-express -i
```

**What you get:**
- ✅ Complete JWT implementation with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based authorization middleware
- ✅ TypeScript types included
- ✅ Production-ready error handling
- ✅ Clear integration instructions

## Available Patterns

### Current Library
- **auth-jwt-express** - JWT authentication with refresh tokens for Express
- **payment-stripe** - Complete Stripe integration with checkout and subscriptions

### Coming Soon
- **storage-s3** - S3 file uploads with presigned URLs
- **cache-redis** - Redis caching layer
- **queue-bull** - Background job processing
- **email-sendgrid** - Transactional emails
- **websocket-socketio** - Real-time connections
- **oauth-google** - Google OAuth flow
- **rate-limit** - API rate limiting
- **search-elasticsearch** - Full-text search

## How It Works

```
packages/discovery/
├── src/
│   ├── patterns/                 # Pattern library
│   │   ├── auth-jwt-express.ts   # JWT auth pattern
│   │   ├── payment-stripe.ts     # Stripe pattern
│   │   └── index.ts              # Pattern registry
│   ├── services/
│   │   └── simple-adaptation-engine.ts  # AST transformations
│   └── cli.ts                    # CLI interface
```

### Pattern Structure

Each pattern includes:
- **Production-tested code** - Complete, working implementation
- **Dependencies** - All required packages with versions
- **Customization points** - Variables you can configure
- **Adaptation rules** - How the code can be transformed
- **Integration instructions** - Clear steps to use it

### Adaptation Engine

The AST-based adaptation engine can:
- Convert naming conventions (camelCase ↔ snake_case ↔ kebab-case)
- Transform error handling patterns
- Apply custom configurations
- Format code to match your style

## The Philosophy

> "The best code is code you don't have to write. The second best is code someone else already debugged."

Rainmaker Discovery embraces this truth. Instead of generating code that might work, we provide code that definitely works - because it's already running in production somewhere.

## CLI Commands

```bash
# List all available patterns
rainmaker list

# Search for patterns
rainmaker search <query>

# Show pattern details
rainmaker show <pattern-id>

# Adapt a pattern to your project
rainmaker adapt <pattern-id> [options]
  -o, --output <path>              Output file path
  -n, --naming <style>             Naming convention
  -e, --error-handling <style>     Error handling style
  -i, --interactive                Interactive mode

# Coming soon
rainmaker create <type> <name>     # Create full applications
rainmaker add <pattern>            # Add to existing project
```

## The Vision

Today: Add individual patterns to your project
Tomorrow: Compose entire applications from patterns

```bash
# Coming soon!
rainmaker create saas-app my-startup \
  --auth=clerk \
  --payments=stripe \
  --database=postgres \
  --hosting=vercel
```

## Contributing

Want to add patterns? We'd love your contributions! Each pattern should be:
- Production-tested
- Well-documented
- Framework-agnostic (where possible)
- Include tests and examples

## License

MIT

---

Built with ❤️ by developers who are tired of reimplementing the same patterns over and over.
