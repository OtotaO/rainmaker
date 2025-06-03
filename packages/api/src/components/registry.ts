// File: packages/api/src/components/registry.ts

/**
 * Rainmaker Curated Component Registry
 * 
 * A carefully curated collection of verified, high-quality components
 * that have been tested, validated, and approved for Rainmaker projects.
 * 
 * Philosophy: "Opinionated and Direct" - No choice paralysis, just quality.
 */

import { z } from 'zod';

// Component quality verification levels
export const ComponentVerificationLevel = z.enum([
  'RAINMAKER_VERIFIED',    // Tested and approved by Rainmaker team
  'COMMUNITY_TRUSTED',     // High community adoption with proven track record
  'ENTERPRISE_GRADE',      // Used in production by major companies
]);

// Component categories for easy discovery
export const ComponentCategory = z.enum([
  'UI_COMPONENTS',         // React/Vue/Angular components
  'STYLING',              // CSS frameworks, component libraries
  'FORMS',                // Form handling, validation
  'DATA_DISPLAY',         // Tables, charts, data visualization
  'NAVIGATION',           // Routing, menus, breadcrumbs
  'AUTHENTICATION',       // Auth providers, session management
  'API_CLIENTS',          // HTTP clients, API integrations
  'STATE_MANAGEMENT',     // Redux, Zustand, Pinia
  'TESTING',              // Testing utilities, mocks
  'BUILD_TOOLS',          // Bundlers, transpilers, dev tools
  'BACKEND_FRAMEWORKS',   // Express, FastAPI, Spring Boot
  'DATABASE',             // ORMs, query builders, migrations
  'UTILITIES',            // Date handling, validation, formatting
]);

// Framework compatibility
export const SupportedFramework = z.enum([
  'REACT',
  'VUE',
  'ANGULAR',
  'SVELTE',
  'VANILLA_JS',
  'NODE_JS',
  'PYTHON',
  'RUST',
  'GO',
  'JAVA',
  'TYPESCRIPT',
]);

// Component registry entry schema
export const CuratedComponentSchema = z.object({
  id: z.string().describe('Unique component identifier'),
  name: z.string().describe('Component display name'),
  description: z.string().describe('Clear, concise description'),
  category: ComponentCategory,
  frameworks: z.array(SupportedFramework).min(1),
  
  // Repository information
  repository: z.object({
    url: z.string().url(),
    stars: z.number().min(100), // Minimum quality threshold
    lastUpdated: z.string().datetime(),
    license: z.string(),
  }),
  
  // Installation and usage
  installation: z.object({
    command: z.string().describe('Primary installation command'),
    alternatives: z.array(z.string()).default([]),
    dependencies: z.array(z.string()).default([]),
  }),
  
  // Quality assurance
  verification: z.object({
    level: ComponentVerificationLevel,
    verifiedAt: z.string().datetime(),
    verifiedBy: z.string(),
    notes: z.string().optional(),
  }),
  
  // Usage guidance
  usage: z.object({
    complexity: z.enum(['SIMPLE', 'MODERATE', 'ADVANCED']),
    setupTime: z.enum(['MINUTES', 'HOURS', 'DAYS']),
    documentation: z.object({
      quality: z.enum(['EXCELLENT', 'GOOD', 'BASIC']),
      url: z.string().url(),
    }),
    examples: z.array(z.object({
      title: z.string(),
      code: z.string(),
      description: z.string(),
    })).default([]),
  }),
  
  // Rainmaker integration
  rainmakerIntegration: z.object({
    codeGeneration: z.boolean().describe('Can be auto-generated in projects'),
    zodSchemas: z.boolean().describe('Includes Zod schema definitions'),
    typeDefinitions: z.boolean().describe('Comprehensive TypeScript types'),
    testingSupport: z.boolean().describe('Includes testing utilities'),
  }),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  addedAt: z.string().datetime(),
  lastReviewed: z.string().datetime(),
});

export type CuratedComponent = z.infer<typeof CuratedComponentSchema>;

/**
 * The Rainmaker Curated Component Registry
 * 
 * Hand-picked, battle-tested components that align with Rainmaker's
 * principles of quality, type safety, and rapid development.
 */
export const RAINMAKER_COMPONENT_REGISTRY: CuratedComponent[] = [
  // UI Components - React
  {
    id: 'shadcn-ui',
    name: 'shadcn/ui',
    description: 'Beautifully designed components built with Radix UI and Tailwind CSS',
    category: 'UI_COMPONENTS',
    frameworks: ['REACT', 'TYPESCRIPT'],
    repository: {
      url: 'https://github.com/shadcn-ui/ui',
      stars: 45000,
      lastUpdated: '2024-01-15T00:00:00Z',
      license: 'MIT',
    },
    installation: {
      command: 'npx shadcn-ui@latest init',
      alternatives: ['npm install @radix-ui/react-*'],
      dependencies: ['@radix-ui/react-*', 'tailwindcss', 'class-variance-authority'],
    },
    verification: {
      level: 'RAINMAKER_VERIFIED',
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'rainmaker-team',
      notes: 'Perfect alignment with Rainmaker design principles',
    },
    usage: {
      complexity: 'SIMPLE',
      setupTime: 'MINUTES',
      documentation: {
        quality: 'EXCELLENT',
        url: 'https://ui.shadcn.com',
      },
      examples: [
        {
          title: 'Button Component',
          code: `import { Button } from "@/components/ui/button"

export function ButtonDemo() {
  return <Button>Click me</Button>
}`,
          description: 'Basic button usage with variants',
        },
      ],
    },
    rainmakerIntegration: {
      codeGeneration: true,
      zodSchemas: true,
      typeDefinitions: true,
      testingSupport: true,
    },
    tags: ['design-system', 'accessibility', 'tailwind'],
    addedAt: '2024-01-01T00:00:00Z',
    lastReviewed: '2024-01-15T00:00:00Z',
  },

  // Forms - React
  {
    id: 'react-hook-form',
    name: 'React Hook Form',
    description: 'Performant, flexible forms with easy validation',
    category: 'FORMS',
    frameworks: ['REACT', 'TYPESCRIPT'],
    repository: {
      url: 'https://github.com/react-hook-form/react-hook-form',
      stars: 38000,
      lastUpdated: '2024-01-10T00:00:00Z',
      license: 'MIT',
    },
    installation: {
      command: 'npm install react-hook-form',
      alternatives: ['yarn add react-hook-form', 'pnpm add react-hook-form'],
      dependencies: [],
    },
    verification: {
      level: 'RAINMAKER_VERIFIED',
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'rainmaker-team',
      notes: 'Excellent Zod integration, minimal re-renders',
    },
    usage: {
      complexity: 'SIMPLE',
      setupTime: 'MINUTES',
      documentation: {
        quality: 'EXCELLENT',
        url: 'https://react-hook-form.com',
      },
      examples: [
        {
          title: 'Basic Form with Zod',
          code: `import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function LoginForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema)
  })
  
  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register("email")} />
      <input {...register("password")} type="password" />
      <button type="submit">Submit</button>
    </form>
  )
}`,
          description: 'Type-safe form with Zod validation',
        },
      ],
    },
    rainmakerIntegration: {
      codeGeneration: true,
      zodSchemas: true,
      typeDefinitions: true,
      testingSupport: true,
    },
    tags: ['forms', 'validation', 'performance'],
    addedAt: '2024-01-01T00:00:00Z',
    lastReviewed: '2024-01-15T00:00:00Z',
  },

  // State Management - React
  {
    id: 'zustand',
    name: 'Zustand',
    description: 'Small, fast and scalable bearbones state-management solution',
    category: 'STATE_MANAGEMENT',
    frameworks: ['REACT', 'TYPESCRIPT'],
    repository: {
      url: 'https://github.com/pmndrs/zustand',
      stars: 35000,
      lastUpdated: '2024-01-12T00:00:00Z',
      license: 'MIT',
    },
    installation: {
      command: 'npm install zustand',
      alternatives: ['yarn add zustand', 'pnpm add zustand'],
      dependencies: [],
    },
    verification: {
      level: 'RAINMAKER_VERIFIED',
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'rainmaker-team',
      notes: 'Simple, TypeScript-first, no boilerplate',
    },
    usage: {
      complexity: 'SIMPLE',
      setupTime: 'MINUTES',
      documentation: {
        quality: 'EXCELLENT',
        url: 'https://zustand-demo.pmnd.rs',
      },
      examples: [
        {
          title: 'Basic Store',
          code: `import { create } from 'zustand'

interface BearState {
  bears: number
  increase: (by: number) => void
}

const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}))

export function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  return <h1>{bears} around here ...</h1>
}`,
          description: 'Type-safe state management with minimal boilerplate',
        },
      ],
    },
    rainmakerIntegration: {
      codeGeneration: true,
      zodSchemas: true,
      typeDefinitions: true,
      testingSupport: true,
    },
    tags: ['state', 'simple', 'typescript'],
    addedAt: '2024-01-01T00:00:00Z',
    lastReviewed: '2024-01-15T00:00:00Z',
  },

  // Backend Framework - Python
  {
    id: 'fastapi',
    name: 'FastAPI',
    description: 'Modern, fast web framework for building APIs with Python 3.7+',
    category: 'BACKEND_FRAMEWORKS',
    frameworks: ['PYTHON'],
    repository: {
      url: 'https://github.com/tiangolo/fastapi',
      stars: 65000,
      lastUpdated: '2024-01-14T00:00:00Z',
      license: 'MIT',
    },
    installation: {
      command: 'pip install fastapi[all]',
      alternatives: ['poetry add fastapi[all]', 'conda install fastapi'],
      dependencies: ['uvicorn', 'pydantic'],
    },
    verification: {
      level: 'ENTERPRISE_GRADE',
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'rainmaker-team',
      notes: 'Automatic OpenAPI docs, Pydantic integration, excellent TypeScript client generation',
    },
    usage: {
      complexity: 'SIMPLE',
      setupTime: 'MINUTES',
      documentation: {
        quality: 'EXCELLENT',
        url: 'https://fastapi.tiangolo.com',
      },
      examples: [
        {
          title: 'Basic API',
          code: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = False

@app.post("/items/")
async def create_item(item: Item):
    return item`,
          description: 'Type-safe API with automatic validation and docs',
        },
      ],
    },
    rainmakerIntegration: {
      codeGeneration: true,
      zodSchemas: false, // Uses Pydantic instead
      typeDefinitions: true,
      testingSupport: true,
    },
    tags: ['api', 'async', 'openapi', 'pydantic'],
    addedAt: '2024-01-01T00:00:00Z',
    lastReviewed: '2024-01-15T00:00:00Z',
  },

  // Database ORM - TypeScript
  {
    id: 'prisma',
    name: 'Prisma',
    description: 'Next-generation ORM for Node.js & TypeScript',
    category: 'DATABASE',
    frameworks: ['NODE_JS', 'TYPESCRIPT'],
    repository: {
      url: 'https://github.com/prisma/prisma',
      stars: 35000,
      lastUpdated: '2024-01-13T00:00:00Z',
      license: 'Apache-2.0',
    },
    installation: {
      command: 'npm install prisma @prisma/client',
      alternatives: ['yarn add prisma @prisma/client'],
      dependencies: [],
    },
    verification: {
      level: 'RAINMAKER_VERIFIED',
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'rainmaker-team',
      notes: 'Already integrated in Rainmaker, perfect type safety',
    },
    usage: {
      complexity: 'MODERATE',
      setupTime: 'HOURS',
      documentation: {
        quality: 'EXCELLENT',
        url: 'https://www.prisma.io/docs',
      },
      examples: [
        {
          title: 'Schema Definition',
          code: `model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  content  String?
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}`,
          description: 'Type-safe database schema with relations',
        },
      ],
    },
    rainmakerIntegration: {
      codeGeneration: true,
      zodSchemas: true, // Via Rainmaker's schema generator
      typeDefinitions: true,
      testingSupport: true,
    },
    tags: ['database', 'orm', 'migrations', 'type-safety'],
    addedAt: '2024-01-01T00:00:00Z',
    lastReviewed: '2024-01-15T00:00:00Z',
  },
];

/**
 * Component Registry Service
 * 
 * Provides curated, opinionated component recommendations
 * based on project requirements and Rainmaker principles.
 */
export class ComponentRegistryService {
  private registry: CuratedComponent[] = RAINMAKER_COMPONENT_REGISTRY;

  /**
   * Get components by category
   */
  getByCategory(category: z.infer<typeof ComponentCategory>): CuratedComponent[] {
    return this.registry.filter(component => component.category === category);
  }

  /**
   * Get components by framework
   */
  getByFramework(framework: z.infer<typeof SupportedFramework>): CuratedComponent[] {
    return this.registry.filter(component => 
      component.frameworks.includes(framework)
    );
  }

  /**
   * Get Rainmaker-verified components only
   */
  getRainmakerVerified(): CuratedComponent[] {
    return this.registry.filter(component => 
      component.verification.level === 'RAINMAKER_VERIFIED'
    );
  }

  /**
   * Get recommended components for a project stack
   */
  getRecommendedStack(
    framework: z.infer<typeof SupportedFramework>,
    categories: z.infer<typeof ComponentCategory>[]
  ): CuratedComponent[] {
    return this.registry.filter(component => 
      component.frameworks.includes(framework) &&
      categories.includes(component.category) &&
      component.verification.level === 'RAINMAKER_VERIFIED'
    );
  }

  /**
   * Get component by ID
   */
  getById(id: string): CuratedComponent | undefined {
    return this.registry.find(component => component.id === id);
  }

  /**
   * Get all components (for admin/debugging)
   */
  getAll(): CuratedComponent[] {
    return this.registry;
  }

  /**
   * Validate a component entry
   */
  validateComponent(component: unknown): CuratedComponent {
    return CuratedComponentSchema.parse(component);
  }
}

export const componentRegistry = new ComponentRegistryService();
