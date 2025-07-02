/**
 * Core types for the Rainmaker Discovery Engine
 * 
 * This is the foundation of our semantic code search and adaptation system.
 * Everything else builds on these types.
 */

import { z } from 'zod';

// Base schemas for JSON serializability
export const JSONPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const JSONValue = z.union([
  JSONPrimitive,
  z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
]);

/**
 * Component metadata - what we store about each indexed component
 */
export const ComponentMetadataSchema = z.object({
  id: z.string().describe('Unique identifier for the component'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('What this component does'),
  
  // Source information
  source: z.object({
    type: z.literal('github'),
    repo: z.string().describe('owner/repo format'),
    path: z.string().describe('Path within the repo'),
    commit: z.string().describe('Commit hash for versioning'),
    url: z.string().url().describe('Direct link to the file'),
    license: z.string().describe('SPDX license identifier'),
  }),
  
  // Quality signals
  quality: z.object({
    stars: z.number().describe('GitHub stars'),
    forks: z.number().describe('Number of forks'),
    lastUpdated: z.string().datetime().describe('Last commit date'),
    hasTests: z.boolean().describe('Whether tests exist'),
    testCoverage: z.number().optional().describe('Test coverage percentage'),
    hasDocumentation: z.boolean().describe('Whether docs exist'),
    weeklyDownloads: z.number().optional().describe('NPM downloads if applicable'),
  }),
  
  // Technical details
  technical: z.object({
    language: z.string().describe('Primary language'),
    framework: z.string().optional().describe('Framework if applicable'),
    dependencies: z.array(z.string()).describe('External dependencies'),
    apis: z.array(z.string()).describe('External APIs used'),
    patterns: z.array(z.string()).describe('Design patterns identified'),
  }),
  
  // Search and matching
  embedding: z.array(z.number()).describe('Vector embedding for semantic search'),
  tags: z.array(z.string()).describe('Searchable tags'),
  category: z.string().describe('High-level category like auth, payments, etc'),
});

export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>;

/**
 * The actual component code and analysis
 */
export const ComponentSchema = z.object({
  metadata: ComponentMetadataSchema,
  
  // The actual code
  code: z.object({
    raw: z.string().describe('Original source code'),
    ast: JSONValue.describe('Parsed AST for analysis'),
    normalized: z.string().describe('Code with standardized formatting'),
  }),
  
  // Generated prompts for matching
  prompts: z.object({
    primary: z.string().describe('Main description for matching'),
    variants: z.array(z.string()).describe('Alternative ways to describe this'),
    questions: z.array(z.string()).describe('Socratic questions that lead here'),
  }),
  
  // Customization points
  customization: z.object({
    variables: z.array(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      defaultValue: z.string().optional(),
    })).describe('Configurable variables'),
    
    injectionPoints: z.array(z.object({
      id: z.string(),
      description: z.string(),
      type: z.enum(['before', 'after', 'replace', 'wrap']),
      location: z.string().describe('AST path or line range'),
    })).describe('Where custom code can be injected'),
    
    patterns: z.array(z.object({
      type: z.string().describe('Pattern type like naming, structure, etc'),
      current: z.string().describe('Current pattern in the code'),
      description: z.string().describe('What this pattern represents'),
    })).describe('Patterns that can be adapted'),
  }),
});

export type Component = z.infer<typeof ComponentSchema>;

/**
 * User context for adaptation
 */
export const UserContextSchema = z.object({
  project: z.object({
    language: z.string(),
    framework: z.string().optional(),
    packageManager: z.union([z.literal('npm'), z.literal('bun'), z.literal('yarn'), z.literal('pnpm')]).optional(),
    conventions: z.object({
      naming: z.union([z.literal('camelCase'), z.literal('snake_case'), z.literal('kebab-case'), z.literal('PascalCase')]),
      imports: z.union([z.literal('named'), z.literal('default'), z.literal('namespace')]),
      exports: z.union([z.literal('named'), z.literal('default'), z.literal('commonjs')]),
    }),
  }),
  
  dependencies: z.record(z.string()).describe('Existing dependencies and versions'),
  
  // Code samples for pattern learning
  samples: z.array(z.object({
    type: z.string().describe('What kind of code this is'),
    code: z.string().describe('Example code from their project'),
  })).optional(),
  
  preferences: z.object({
    style: z.union([z.literal('functional'), z.literal('oop'), z.literal('mixed')]).optional(),
    errorHandling: z.union([z.literal('exceptions'), z.literal('result-types'), z.literal('callbacks')]).optional(),
    asyncPattern: z.union([z.literal('promises'), z.literal('async-await'), z.literal('callbacks')]).optional(),
  }),
});

export type UserContext = z.infer<typeof UserContextSchema>;

/**
 * Socratic dialogue for refinement
 */
export const DialogueNodeSchema = z.object({
  id: z.string(),
  question: z.string().describe('Question to ask the user'),
  type: z.enum(['single-choice', 'multi-choice', 'text', 'confirm']),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    followUp: z.string().optional().describe('Next node ID'),
  })).optional(),
  
  // How this affects search
  impact: z.object({
    tags: z.array(z.string()).optional().describe('Tags to add to search'),
    exclude: z.array(z.string()).optional().describe('Tags to exclude'),
    boost: z.record(z.number()).optional().describe('Boost certain aspects'),
  }),
});

export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

/**
 * Search request after Socratic refinement
 */
export const SearchRequestSchema = z.object({
  query: z.string().describe('Original user query'),
  refined: z.object({
    description: z.string().describe('Refined problem description'),
    requirements: z.array(z.string()).describe('Specific requirements identified'),
    constraints: z.array(z.string()).describe('Constraints or limitations'),
  }),
  
  context: UserContextSchema,
  
  filters: z.object({
    languages: z.array(z.string()).optional(),
    frameworks: z.array(z.string()).optional(),
    minStars: z.number().optional(),
    hasTests: z.boolean().optional(),
    license: z.array(z.string()).optional(),
  }).optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Adaptation instructions
 */
export const AdaptationPlanSchema = z.object({
  component: z.string().describe('Component ID to adapt'),
  
  transformations: z.array(z.discriminatedUnion('type', [
    // Rename symbols (variables, functions, classes)
    z.object({
      type: z.literal('rename'),
      target: z.string().describe('AST selector or pattern'),
      from: z.string(),
      to: z.string(),
    }),
    
    // Replace dependencies
    z.object({
      type: z.literal('replace-import'),
      from: z.string(),
      to: z.string(),
      importStyle: z.enum(['named', 'default', 'namespace']).optional(),
    }),
    
    // Inject custom code
    z.object({
      type: z.literal('inject'),
      point: z.string().describe('Injection point ID'),
      code: z.string(),
      position: z.enum(['before', 'after', 'replace', 'wrap']),
    }),
    
    // Change patterns (like error handling)
    z.object({
      type: z.literal('pattern'),
      pattern: z.string(),
      from: z.string(),
      to: z.string(),
    }),
    
    // Configure variables
    z.object({
      type: z.literal('configure'),
      variable: z.string(),
      value: z.string(),
    }),
  ])),
  
  // Additional files to generate
  additions: z.array(z.object({
    path: z.string(),
    content: z.string(),
    description: z.string(),
  })).optional(),
});

export type AdaptationPlan = z.infer<typeof AdaptationPlanSchema>;

/**
 * Final adapted result
 */
export const AdaptedComponentSchema = z.object({
  original: ComponentMetadataSchema,
  
  adapted: z.object({
    code: z.string().describe('Final adapted code'),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      description: z.string(),
    })).describe('All files including the main one'),
    
    instructions: z.object({
      install: z.array(z.string()).describe('Commands to run'),
      setup: z.array(z.string()).describe('Setup steps'),
      usage: z.string().describe('How to use this component'),
    }),
    
    attribution: z.string().describe('Attribution text for the original'),
  }),
  
  plan: AdaptationPlanSchema.describe('The plan that was executed'),
});

export type AdaptedComponent = z.infer<typeof AdaptedComponentSchema>;
