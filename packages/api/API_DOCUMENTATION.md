# Discovery API Documentation

The Discovery API provides endpoints for searching, analyzing, and adapting code components.

## Base URL
```
http://localhost:3001/api/discovery
```

## Endpoints

### 1. Search Components
**POST** `/api/discovery/search`

Search for code components using semantic search.

**Request Body:**
```json
{
  "query": "authentication middleware",
  "limit": 10,
  "filters": {
    "category": "auth",
    "language": "typescript",
    "framework": "express",
    "minStars": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "authentication middleware",
    "totalResults": 2,
    "results": [
      {
        "id": "sample-jwtauth",
        "name": "JWTAuthMiddleware",
        "description": "Express middleware for JWT authentication",
        "category": "auth",
        "score": 0.95,
        "reasoning": "Strong match, contains query keywords",
        "technical": {
          "language": "typescript",
          "framework": "express",
          "dependencies": ["express", "jsonwebtoken"],
          "patterns": ["authentication", "jwt", "middleware", "async"]
        },
        "quality": {
          "stars": 200,
          "forks": 40,
          "hasTests": true,
          "testCoverage": 90,
          "hasDocumentation": true
        }
      }
    ]
  }
}
```

### 2. Analyze Component
**POST** `/api/discovery/analyze`

Get detailed analysis of a specific component.

**Request Body:**
```json
{
  "componentId": "sample-jwtauth",
  "includePatterns": true,
  "includeQuality": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "component": {
      "id": "sample-jwtauth",
      "name": "JWTAuthMiddleware",
      "description": "Express middleware for JWT authentication"
    },
    "analysis": {
      "patterns": ["authentication", "jwt", "middleware", "async"],
      "dependencies": ["express", "jsonwebtoken"],
      "quality": {
        "stars": 200,
        "forks": 40,
        "hasTests": true,
        "testCoverage": 90,
        "hasDocumentation": true
      },
      "codeMetrics": {
        "lines": 50,
        "size": 1500,
        "language": "typescript",
        "framework": "express"
      }
    }
  }
}
```

### 3. Adapt Component
**POST** `/api/discovery/adapt`

Adapt a component's code with various transformations.

**Request Body:**
```json
{
  "componentId": "sample-jwtauth",
  "adaptations": {
    "namingConvention": "snake_case",
    "importStyle": "named",
    "errorHandling": "async-await",
    "customInjections": [
      {
        "type": "before",
        "target": "class JWTAuthMiddleware",
        "code": "// Custom header comment"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": {
      "id": "sample-jwtauth",
      "name": "JWTAuthMiddleware"
    },
    "adaptations": {
      "namingConvention": "snake_case",
      "importStyle": "named"
    },
    "adaptedCode": "// Adapted code here...",
    "diff": "// Diff showing changes..."
  }
}
```

### 4. Socratic Dialogue
**POST** `/api/discovery/dialogue`

Interactive dialogue to refine component requirements.

**Request Body (Initial):**
```json
{
  "sessionId": null,
  "userResponse": null,
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abc123",
    "question": "What type of component are you looking for?",
    "options": [
      "Authentication",
      "Payment Processing",
      "Data Validation",
      "API Integration",
      "Other"
    ],
    "isComplete": false
  }
}
```

**Request Body (Continue):**
```json
{
  "sessionId": "session_1234567890_abc123",
  "userResponse": "Authentication",
  "context": {}
}
```

### 5. Get Component
**GET** `/api/discovery/components/:id`

Get a specific component by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "id": "sample-jwtauth",
      "name": "JWTAuthMiddleware",
      "description": "Express middleware for JWT authentication",
      "category": "auth",
      "source": {
        "type": "github",
        "repo": "example/auth-middleware",
        "path": "src/jwt.ts",
        "url": "https://github.com/example/auth-middleware",
        "commit": "def456",
        "license": "MIT"
      },
      "quality": {
        "stars": 200,
        "forks": 40,
        "hasTests": true,
        "testCoverage": 90,
        "hasDocumentation": true
      },
      "technical": {
        "language": "typescript",
        "framework": "express",
        "dependencies": ["express", "jsonwebtoken"],
        "apis": [],
        "patterns": ["authentication", "jwt", "middleware", "async"]
      },
      "embedding": [],
      "tags": ["auth", "jwt", "express", "middleware"]
    },
    "code": {
      "raw": "// JWT Middleware code...",
      "normalized": "// Normalized code..."
    },
    "prompts": {
      "primary": "Set up JWT authentication middleware in your Express app",
      "variants": [
        "Use the JWTAuthMiddleware to protect routes",
        "Configure JWT secret and expiration time",
        "Generate and verify JWT tokens"
      ],
      "questions": [
        "What should be the token expiration time?",
        "Which routes need authentication?",
        "Do you need refresh token support?"
      ]
    },
    "customization": {
      "variables": [],
      "patterns": [],
      "injectionPoints": []
    }
  }
}
```

### 6. Health Check
**GET** `/api/discovery/health`

Check the health status of the discovery service.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-04T10:17:00.000Z",
  "services": {
    "discovery": "operational",
    "socratic": "operational",
    "adaptation": "operational"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Testing with cURL

### Search for components
```bash
curl -X POST http://localhost:3001/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication",
    "limit": 5
  }'
```

### Get component details
```bash
curl http://localhost:3001/api/discovery/components/sample-jwtauth
```

### Health check
```bash
curl http://localhost:3001/api/discovery/health
```

## Notes

- The current implementation uses sample data for demonstration
- To enable full functionality, configure API keys in `.env` files
- The adaptation engine provides simple transformations - production use would require AST-based transformations
- Socratic dialogue uses a simple 3-step flow for demonstration
