# Smart GitHub Search

An AI-powered GitHub component search system that helps developers find relevant, high-quality repositories using natural language queries.

## Overview

The Smart GitHub Search feature leverages Claude 3.7 Sonnet to understand natural language component requests and intelligently search GitHub for the most relevant repositories. It goes beyond simple keyword matching by:

- **Understanding Intent**: Uses AI to extract key features and technical requirements from natural language
- **Quality Assessment**: Evaluates repositories based on maintenance, documentation, and community engagement
- **Smart Ranking**: Combines GitHub metrics with AI-driven relevance scoring
- **Installation Guidance**: Provides appropriate installation commands based on language and package manager

## Features

### 🧠 AI-Powered Query Understanding
- Converts natural language requests into optimized GitHub search queries
- Extracts technical features, programming languages, and frameworks
- Suggests alternatives when specific requirements aren't provided

### 🎯 Intelligent Ranking
- **Relevance Score (1-10)**: How well the component matches your specific request
- **Quality Score (1-10)**: Assessment of maintenance, documentation, and community health
- **Combined Scoring**: Results ranked by overall suitability

### 📦 Installation Ready
- Automatic generation of installation commands (npm, pip, cargo, go get, etc.)
- Language-specific package manager detection
- Fallback to git clone for non-packaged repositories

### ⚡ Performance Optimized
- Concurrent GitHub API searches with deduplication
- Batch processing of AI assessments
- Configurable timeouts and retry mechanisms
- Comprehensive error handling and fallbacks

## API Usage

### Endpoint
```
POST /api/github/search
```

### Request Schema
```typescript
{
  query: string;           // Natural language description (required)
  language?: string;       // Preferred programming language
  framework?: string;      // Preferred framework
  maxResults?: number;     // Maximum results to return (1-50, default: 10)
}
```

### Response Schema
```typescript
{
  results: RankedComponent[];     // Array of ranked components
  totalFound: number;             // Total repositories found before ranking
  queryProcessingTime: number;    // Processing time in milliseconds
  originalQuery: string;          // Your original query
  refinedQueries: string[];       // AI-generated search terms used
}
```

### Example Request
```bash
curl -X POST http://localhost:3001/api/github/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need a responsive date picker component for React with range selection",
    "language": "typescript",
    "framework": "react",
    "maxResults": 5
  }'
```

### Example Response
```json
{
  "results": [
    {
      "repository": {
        "id": 123456,
        "name": "react-datepicker",
        "full_name": "Hacker0x01/react-datepicker",
        "description": "A simple and reusable datepicker component for React",
        "html_url": "https://github.com/Hacker0x01/react-datepicker",
        "stargazers_count": 7500,
        "forks_count": 2200,
        "language": "JavaScript",
        "license": { "name": "MIT License" },
        "topics": ["react", "datepicker", "component"]
      },
      "assessment": {
        "relevanceScore": 9,
        "qualityScore": 8,
        "justification": "Highly relevant React datepicker with excellent community support",
        "keyFeatures": ["date selection", "customizable", "accessible"],
        "usageComplexity": "simple"
      },
      "installationCommand": "npm install react-datepicker",
      "documentationUrl": "https://github.com/Hacker0x01/react-datepicker#readme"
    }
  ],
  "totalFound": 25,
  "queryProcessingTime": 3420,
  "originalQuery": "I need a responsive date picker component for React with range selection",
  "refinedQueries": ["react datepicker range", "react date picker component"]
}
```

## Service Usage

### Direct Service Integration
```typescript
import { GitHubSearchService } from './github/search-service';
import { GitHubSearchQuery } from '../../shared/src/schemas/github';

const searchService = new GitHubSearchService();

const query: GitHubSearchQuery = {
  query: 'Vue.js component library with TypeScript support',
  language: 'typescript',
  framework: 'vue',
  maxResults: 3,
};

const results = await searchService.searchComponents(query);
console.log(`Found ${results.results.length} components`);
```

## Example Queries

### Frontend Components
```json
{
  "query": "responsive navigation menu with mobile hamburger",
  "language": "typescript",
  "framework": "react"
}
```

### Backend Libraries
```json
{
  "query": "fast web API framework with automatic documentation",
  "language": "python"
}
```

### Development Tools
```json
{
  "query": "markdown editor with live preview and syntax highlighting"
}
```

### Data Processing
```json
{
  "query": "CSV parser with custom delimiters and type inference",
  "language": "rust"
}
```

## Configuration

### Environment Variables
```bash
# Required
GITHUB_TOKEN=your_github_personal_access_token
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional (with defaults)
GITHUB_SEARCH_TIMEOUT=10000        # GitHub API timeout (ms)
LLM_TIMEOUT=15000                  # LLM processing timeout (ms)
MAX_GITHUB_RESULTS=30              # Max repos to process
```

### Service Configuration
The service includes several configurable parameters:

- **Search Timeout**: 10 seconds for GitHub API calls
- **LLM Timeout**: 15 seconds for AI processing
- **Batch Size**: 5 repositories per AI assessment batch
- **Quality Filters**: Minimum 10 stars, updated since 2023
- **Retry Logic**: Exponential backoff for failed requests

## Architecture

### Flow Diagram
```
User Query → LLM Query Refinement → GitHub API Search → AI Assessment → Ranked Results
     ↓              ↓                      ↓               ↓              ↓
Natural Language → Search Terms → Raw Repositories → Quality Scores → Final Response
```

### Key Components

1. **GitHubSearchService**: Main orchestrator
2. **Query Refinement**: AI-powered search term generation
3. **GitHub Integration**: Multi-query search with deduplication
4. **Assessment Engine**: AI-driven quality and relevance scoring
5. **Result Ranking**: Combined scoring and sorting

### Error Handling

- **LLM Timeouts**: Fallback to basic search terms
- **GitHub Rate Limits**: Clear error messages with retry guidance
- **Invalid Repositories**: Graceful filtering with logging
- **Network Issues**: Timeout protection and error recovery

## Testing

### Unit Tests
```bash
cd packages/api
bun test src/__tests__/github-search.test.ts
```

### Integration Testing
```bash
# Run the example script
bun run src/examples/github-search-example.ts
```

### Manual Testing
```bash
# Test the API endpoint
curl -X POST http://localhost:3001/api/github/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test component", "maxResults": 1}'
```

## Performance Considerations

### Optimization Strategies
- **Concurrent Processing**: Multiple GitHub searches run in parallel
- **Deduplication**: Repository IDs used to eliminate duplicates
- **Batch Assessment**: AI evaluations processed in batches of 5
- **Smart Caching**: Results could be cached for repeated queries (future enhancement)

### Typical Performance
- **Simple Queries**: 2-4 seconds
- **Complex Queries**: 4-8 seconds
- **Rate Limited**: Graceful degradation with clear messaging

## Limitations

### Current Constraints
- **GitHub API Rate Limits**: 5,000 requests/hour for authenticated users
- **LLM Processing Time**: AI assessment adds 2-5 seconds per batch
- **Language Support**: Best results for popular languages and frameworks
- **Repository Freshness**: Focuses on recently updated repositories (2023+)

### Future Enhancements
- **Caching Layer**: Redis-based result caching
- **Code Analysis**: Direct repository code evaluation
- **User Preferences**: Personalized ranking based on history
- **Batch Endpoints**: Process multiple queries simultaneously

## Troubleshooting

### Common Issues

**"GitHub API rate limit exceeded"**
- Wait for rate limit reset (check headers)
- Use a different GitHub token
- Reduce query frequency

**"LLM query refinement timed out"**
- Check ANTHROPIC_API_KEY validity
- Verify network connectivity
- Service falls back to basic search terms

**"No results found"**
- Try broader search terms
- Remove language/framework constraints
- Check if repositories exist for your query

### Debug Logging
Enable debug logging to see detailed processing steps:
```typescript
import { logger } from '../lib/logger';
logger.level = 'debug';
```

## Contributing

### Adding New Features
1. Update schemas in `packages/shared/src/schemas/github.ts`
2. Implement service logic in `GitHubSearchService`
3. Add comprehensive tests
4. Update API documentation

### Code Quality
- Follow existing TypeScript patterns
- Add comprehensive error handling
- Include detailed logging
- Write unit and integration tests

## License

This feature is part of the Rainmaker project and follows the same licensing terms.
