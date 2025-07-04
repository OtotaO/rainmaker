# 🚀 Rainmaker Discovery - Quick Start Guide

Get up and running with Rainmaker Discovery in 5 minutes!

## Prerequisites

- **Bun** (v1.0+) - [Install Bun](https://bun.sh)
- **PostgreSQL** (v14+) - [Install PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Install Git](https://git-scm.com/downloads)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/OtotaO/rainmaker.git
cd rainmaker

# Install dependencies
bun install
```

## Step 2: Configure Environment

Run our interactive setup script:

```bash
./scripts/setup-env.sh
```

This will guide you through setting up:
- 🔑 **GitHub Token** (required) - For indexing GitHub repositories
- 🤖 **OpenAI API Key** (optional) - For semantic search
- 🧠 **Anthropic API Key** (optional) - For AI-powered features
- 🗄️ **Database URL** - PostgreSQL connection string

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Copy example files
cp packages/discovery/.env.example packages/discovery/.env
cp packages/api/.env.example packages/api/.env

# Edit the files with your values
# Required: GITHUB_TOKEN in both files
# Optional: OPENAI_API_KEY, ANTHROPIC_API_KEY
```

## Step 3: Set Up Database

```bash
# Navigate to API package
cd packages/api

# Create database (if not exists)
createdb rainmaker_discovery

# Run migrations
bunx prisma migrate dev

# Go back to root
cd ../..
```

## Step 4: Test the Discovery Engine

### Option A: Simple CLI Test (Recommended First)

```bash
cd packages/discovery
bun run src/simple-cli.ts
```

You should see:
- Sample components being indexed
- Search results for various queries
- Similarity scores and reasoning

### Option B: Full Feature Test

```bash
# Test Socratic dialogue (works without API keys)
bun run src/test-socratic-dialogue.ts

# Test GitHub indexing (requires GITHUB_TOKEN)
bun run src/test-github-indexer.ts

# Test full discovery flow (best with all API keys)
bun run src/test-enhanced-discovery.ts
```

## Step 5: Start Development Servers

```bash
# From project root
bun run dev:all
```

This starts:
- 📡 **API Server**: http://localhost:3001
- 🌐 **Frontend**: http://localhost:3000

## What Works Without API Keys?

The system has graceful fallbacks:

| Feature | Without Keys | With Keys |
|---------|--------------|-----------|
| Basic Search | ✅ Hash-based | ✅ Semantic (OpenAI) |
| Code Analysis | ✅ AST-based | ✅ AI-enhanced (Anthropic) |
| Socratic Dialogue | ✅ Static questions | ✅ Dynamic AI questions |
| Quality Assessment | ✅ Rule-based | ✅ AI-powered scoring |
| GitHub Indexing | ❌ Needs token | ✅ Full indexing |

## Common Issues

### PostgreSQL Connection Error
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Missing Dependencies
```bash
# Clean install
rm -rf node_modules bun.lockb
bun install
```

## Next Steps

1. **Explore the CLI**: Try different search queries in `simple-cli.ts`
2. **Index a Repository**: Modify `test-github-indexer.ts` to index your repos
3. **Build UI Components**: Check `TODO_PRODUCTION_READY.md` for frontend tasks
4. **Add API Endpoints**: Extend the API to expose discovery features

## Getting Help

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/OtotaO/rainmaker/issues)
- 💡 [Project Status](./PROJECT_STATUS.md)

---

**Pro Tip**: Start without API keys to understand the core functionality, then add keys one by one to see the enhanced features! 🎯
