#!/bin/bash

# Rainmaker Discovery Environment Setup Script
# This script helps you set up the necessary environment files

echo "🚀 Rainmaker Discovery Environment Setup"
echo "========================================"
echo ""

# Function to prompt for input with a default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    read -p "$prompt [$default]: " value
    value="${value:-$default}"
    eval "$var_name='$value'"
}

# Function to prompt for secret input
prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " value
    echo ""  # New line after secret input
    eval "$var_name='$value'"
}

# Check if .env files already exist
if [ -f "packages/discovery/.env" ] || [ -f "packages/api/.env" ]; then
    echo "⚠️  Warning: .env files already exist!"
    read -p "Do you want to overwrite them? (y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo "Let's configure your environment variables..."
echo ""

# GitHub Configuration
echo "📦 GitHub Configuration (Required for GitHub indexing)"
echo "Create a personal access token at: https://github.com/settings/tokens"
echo "Required scopes: repo (for public repos) or repo + read:org (for private repos)"
prompt_secret "Enter your GitHub Personal Access Token" GITHUB_TOKEN

# OpenAI Configuration
echo ""
echo "🤖 OpenAI Configuration (Optional - enables semantic search)"
echo "Get your API key at: https://platform.openai.com/api-keys"
read -p "Do you have an OpenAI API key? (y/N): " has_openai
if [ "$has_openai" = "y" ] || [ "$has_openai" = "Y" ]; then
    prompt_secret "Enter your OpenAI API key" OPENAI_API_KEY
else
    OPENAI_API_KEY=""
    echo "Skipping OpenAI configuration (system will use fallback embeddings)"
fi

# Anthropic Configuration
echo ""
echo "🧠 Anthropic Configuration (Optional - enables LLM features)"
echo "Get your API key at: https://console.anthropic.com/account/keys"
read -p "Do you have an Anthropic API key? (y/N): " has_anthropic
if [ "$has_anthropic" = "y" ] || [ "$has_anthropic" = "Y" ]; then
    prompt_secret "Enter your Anthropic API key" ANTHROPIC_API_KEY
else
    ANTHROPIC_API_KEY=""
    echo "Skipping Anthropic configuration (system will use static fallbacks)"
fi

# Database Configuration
echo ""
echo "🗄️  Database Configuration"
prompt_with_default "Enter your PostgreSQL connection URL" "postgresql://postgres:postgres@localhost:5432/rainmaker_discovery" DATABASE_URL

# API Configuration
echo ""
echo "🌐 API Server Configuration"
prompt_with_default "Enter the API server port" "3001" API_PORT
prompt_with_default "Enter the frontend URL for CORS" "http://localhost:3000" CORS_ORIGIN

# Session Secret
echo ""
echo "🔐 Security Configuration"
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | head -c 32 | base64)
echo "Generated session secret: ${SESSION_SECRET:0:10}..."

# Create packages/discovery/.env
echo ""
echo "Creating packages/discovery/.env..."
cat > packages/discovery/.env << EOF
# GitHub Configuration
GITHUB_TOKEN=${GITHUB_TOKEN}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# Anthropic Configuration
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# Cache Configuration
CACHE_DIR=./data/discovery
CACHE_TTL=86400

# Feature Flags
ENABLE_LLM_FEATURES=true
ENABLE_GITHUB_INDEXING=true
ENABLE_CACHE=true

# Rate Limiting
GITHUB_RATE_LIMIT_PER_HOUR=5000
LLM_RATE_LIMIT_PER_MINUTE=60

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF

# Create packages/api/.env
echo "Creating packages/api/.env..."
cat > packages/api/.env << EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# API Server Configuration
PORT=${API_PORT}
NODE_ENV=development

# Anthropic API Key for AI features
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# GitHub Configuration
GITHUB_TOKEN=${GITHUB_TOKEN}

# CORS Configuration
CORS_ORIGIN=${CORS_ORIGIN}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_SECRET=${SESSION_SECRET}

# Logging
LOG_LEVEL=info
EOF

echo ""
echo "✅ Environment files created successfully!"
echo ""
echo "📋 Summary:"
echo "- GitHub Token: ${GITHUB_TOKEN:0:10}... (configured)"
if [ -n "$OPENAI_API_KEY" ]; then
    echo "- OpenAI API: ✅ Configured (semantic search enabled)"
else
    echo "- OpenAI API: ❌ Not configured (using fallback embeddings)"
fi
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "- Anthropic API: ✅ Configured (LLM features enabled)"
else
    echo "- Anthropic API: ❌ Not configured (using static fallbacks)"
fi
echo "- Database URL: ${DATABASE_URL}"
echo "- API Port: ${API_PORT}"
echo "- CORS Origin: ${CORS_ORIGIN}"
echo ""
echo "🚀 Next steps:"
echo "1. Install dependencies: bun install"
echo "2. Set up the database: cd packages/api && bunx prisma migrate dev"
echo "3. Start the development servers: bun run dev:all"
echo "4. Test the discovery engine: cd packages/discovery && bun run src/simple-cli.ts"
echo ""
echo "For more information, see the README.md file."
