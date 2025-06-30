# Rainmaker Migration Guide: From PRD Generation to Component Discovery

## Overview

We're pivoting Rainmaker from a "generate new code" tool to a "find and adapt existing code" tool. This is a fundamental shift that will deliver real value to developers.

### What's Changing

**Old System (PRD Generation)**
- Generated Product Requirements Documents
- Complex refinement pipeline
- AI writes code from scratch
- Multiple stages of review
- Theoretical approach

**New System (Component Discovery)**
- Semantic search through GitHub
- Socratic dialogue for refinement
- Find proven, tested code
- Intelligent adaptation
- Practical, immediate value

## Migration Steps

### 1. Backend Migration

#### Update Dependencies
```bash
cd packages/api
bun add @octokit/rest @babel/parser @babel/traverse @babel/generator @babel/types prettier
```

#### Update Server
Replace the PRD routes with discovery routes in `packages/api/src/server.ts`:

```typescript
import { discoveryContract } from '../../discovery/src/routes/discovery';
import { createDiscoveryRouter } from '../../discovery/src/routes/implementation';
import { DiscoveryService } from '../../discovery/src/services/discovery-service';

// Initialize discovery service
const discoveryService = new DiscoveryService({
  prisma,
  githubToken: process.env.GITHUB_TOKEN!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
});

// Add to contract
const contract = {
  // ... existing routes
  discovery: discoveryContract,
};

// Add to router
const router = s.router(contract, {
  // ... existing implementations
  discovery: createDiscoveryRouter(discoveryService),
});
```

### 2. Frontend Migration

#### Update App.tsx
Replace PRDGenerator with DiscoveryFlow:

```typescript
import { DiscoveryFlow } from './components/Discovery/DiscoveryFlow';

const App: React.FC = () => {
  return <DiscoveryFlow />;
};
```

### 3. Database Migration

Create a new migration for component storage:

```sql
-- Create components table
CREATE TABLE components (
  id TEXT PRIMARY KEY,
  metadata JSONB NOT NULL,
  code JSONB NOT NULL,
  prompts JSONB NOT NULL,
  customization JSONB NOT NULL,
  category TEXT NOT NULL,
  indexed_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for search
  INDEX idx_components_category (category),
  INDEX idx_components_metadata_gin (metadata),
  INDEX idx_components_indexed_at (indexed_at)
);

-- Create adaptation history table
CREATE TABLE adaptation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id TEXT NOT NULL,
  user_context JSONB NOT NULL,
  adaptation_plan JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (component_id) REFERENCES components(id)
);
```

### 4. Initial Component Indexing

Run the indexer to populate your component library:

```bash
# Create an indexing script
cat > scripts/index-components.ts << 'EOF'
import { DiscoveryService } from '../packages/discovery/src/services/discovery-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new DiscoveryService({
  prisma,
  githubToken: process.env.GITHUB_TOKEN!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
});

async function indexInitialCategories() {
  const categories = ['auth', 'payments', 'database', 'api'];
  
  for (const category of categories) {
    console.log(`Indexing ${category}...`);
    const count = await service.indexCategory(category, {
      minStars: 100,
      languages: ['typescript', 'javascript'],
      limit: 50,
    });
    console.log(`Indexed ${count} components for ${category}`);
  }
}

indexInitialCategories().catch(console.error);
EOF

bun run scripts/index-components.ts
```

## Key Differences

### User Experience

**Before**: Answer abstract questions → Generate PRD → Review → Refine → Maybe get code

**After**: Describe need → Answer specific questions → See real implementations → Get working code

### Technical Architecture

**Before**: Complex state machine, multiple AI calls, document generation

**After**: Search + dialogue + adaptation, single focused AI usage

### Value Proposition

**Before**: "We'll help you think about your feature"

**After**: "We'll find proven code that solves your problem"

## Rollback Plan

If needed, the old PRD system remains in the codebase. To rollback:

1. Revert App.tsx to use PRDGenerator
2. Remove discovery routes from server
3. Re-enable PRD routes

## Benefits of the New System

1. **Faster Time to Code**: Minutes, not hours
2. **Higher Quality**: Battle-tested code from popular repos
3. **Learning Opportunity**: See how others solved the problem
4. **Legal Clarity**: Proper attribution and license handling
5. **Customization**: Automatic adaptation to your style
6. **Continuous Improvement**: System learns from usage

## Next Steps

1. **Phase 1**: Basic search and adaptation (MVP)
2. **Phase 2**: Improve Socratic dialogue with ML
3. **Phase 3**: Add more categories and languages
4. **Phase 4**: Community contributions
5. **Phase 5**: Private component libraries

## FAQ

**Q: What happens to existing PRDs?**
A: They remain in the database but are not used in the new flow.

**Q: Can we still generate new code?**
A: The system focuses on finding and adapting. For truly novel requirements, users can adapt the closest match.

**Q: How do we handle private code?**
A: Phase 5 will add support for indexing private repositories.

**Q: What about code quality?**
A: We filter by stars, tests, and activity. Quality signals are built into the search.

## Conclusion

This migration transforms Rainmaker from a theoretical tool into a practical developer accelerator. Instead of generating potentially buggy code, we're leveraging the collective intelligence of the developer community.

The future of development isn't AI writing code from scratch - it's AI helping you find and adapt the millions of solutions that already exist.