/**
 * Code Analyzer Service
 * 
 * Parses and analyzes code to understand its structure, patterns, and customization points.
 * This is the brain that understands what code does and how it can be adapted.
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { logger } from '../utils/logger';

export interface CodeAnalysis {
  name: string;
  description: string;
  language: string;
  framework?: string;
  dependencies: string[];
  apis: string[];
  patterns: string[];
  tags: string[];
  ast: any;
  normalizedCode: string;
  hasTests: boolean;
  hasDocumentation: boolean;
  primaryPrompt: string;
  promptVariants: string[];
  configurableVariables: Array<{
    name: string;
    type: string;
    description: string;
    defaultValue?: string;
  }>;
  injectionPoints: Array<{
    id: string;
    description: string;
    type: 'before' | 'after' | 'replace' | 'wrap';
    location: string;
  }>;
  adaptablePatterns: Array<{
    type: string;
    current: string;
    description: string;
  }>;
}

export async function analyzeCode(content: string, filepath: string): Promise<CodeAnalysis | null> {
  try {
    const language = detectLanguage(filepath);
    const ast = parseCode(content, language);
    if (!ast) return null;
    
    const framework = detectFramework(content, ast);
    const analysis: CodeAnalysis = {
      name: extractComponentName(ast, filepath),
      description: '',
      language,
      ...(framework && { framework }),
      dependencies: extractDependencies(ast),
      apis: extractAPIs(ast),
      patterns: detectPatterns(ast, content),
      tags: [],
      ast,
      normalizedCode: normalizeCode(ast, language),
      hasTests: false,
      hasDocumentation: hasDocumentation(content),
      primaryPrompt: '',
      promptVariants: [],
      configurableVariables: extractConfigurableVariables(ast),
      injectionPoints: findInjectionPoints(ast),
      adaptablePatterns: findAdaptablePatterns(ast, content),
    };
    
    // Generate description and prompts
    analysis.description = generateDescription(analysis);
    analysis.primaryPrompt = generatePrimaryPrompt(analysis);
    analysis.promptVariants = generatePromptVariants(analysis);
    analysis.tags = generateTags(analysis);
    
    return analysis;
  } catch (error) {
    logger.error(`Failed to analyze code in ${filepath}:`, error);
    return null;
  }
}

/**
 * Detect the programming language from filepath
 */
function detectLanguage(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
  };
  return languageMap[ext || ''] || 'unknown';
}

/**
 * Parse code into AST
 */
function parseCode(content: string, language: string): any {
  try {
    if (language === 'typescript' || language === 'javascript') {
      return parser.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });
    }
    // For other languages, we'd need different parsers
    return null;
  } catch (error) {
    logger.debug('Failed to parse code:', error);
    return null;
  }
}

/**
 * Extract the main component/function name
 */
function extractComponentName(ast: any, filepath: string): string {
  let name = filepath.split('/').pop()?.split('.')[0] || 'Component';
  
  // Try to find the main export
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
        name = path.node.declaration.id.name;
      } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
        name = path.node.declaration.id.name;
      }
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration) {
        if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          name = path.node.declaration.id.name;
        } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
          name = path.node.declaration.id.name;
        }
      }
    },
  });
  
  return name;
}

/**
 * Detect the framework being used
 */
function detectFramework(content: string, ast: any): string | undefined {
  // Check imports
  const imports = new Set<string>();
  traverse(ast, {
    ImportDeclaration(path) {
      imports.add(path.node.source.value);
    },
  });
  
  // Framework detection rules
  if (imports.has('react') || imports.has('react-dom')) return 'react';
  if (imports.has('vue')) return 'vue';
  if (imports.has('@angular/core')) return 'angular';
  if (imports.has('svelte')) return 'svelte';
  if (imports.has('express')) return 'express';
  if (imports.has('fastify')) return 'fastify';
  if (imports.has('next')) return 'nextjs';
  if (imports.has('nuxt')) return 'nuxt';
  
  // Check for framework-specific patterns in content
  if (content.includes('React.')) return 'react';
  if (content.includes('Vue.')) return 'vue';
  if (content.includes('Angular')) return 'angular';
  
  return undefined;
}

/**
 * Extract dependencies from imports
 */
function extractDependencies(ast: any): string[] {
  const deps = new Set<string>();
  
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      // Only external dependencies (not relative imports)
      if (!source.startsWith('.') && !source.startsWith('/')) {
        deps.add(source.split('/')[0]); // Get package name
      }
    },
    CallExpression(path) {
      // Check for require() calls
      if (t.isIdentifier(path.node.callee, { name: 'require' }) &&
          t.isStringLiteral(path.node.arguments[0])) {
        const source = path.node.arguments[0].value;
        if (!source.startsWith('.') && !source.startsWith('/')) {
          deps.add(source.split('/')[0]);
        }
      }
    },
  });
  
  return Array.from(deps);
}

/**
 * Extract external APIs being used
 */
function extractAPIs(ast: any): string[] {
  const apis = new Set<string>();
  
  traverse(ast, {
    // Look for fetch/axios calls
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: 'fetch' }) ||
          (t.isMemberExpression(path.node.callee) && 
           t.isIdentifier(path.node.callee.object, { name: 'axios' }))) {
        // Try to extract URL
        if (t.isStringLiteral(path.node.arguments[0])) {
          const url = path.node.arguments[0].value;
          if (url.startsWith('http')) {
            const domain = new URL(url).hostname;
            apis.add(domain);
          }
        }
      }
    },
    // Look for API configuration
    StringLiteral(path) {
      const value = path.node.value;
      if (value.includes('api.') || value.includes('apis.')) {
        try {
          const domain = new URL(value).hostname;
          apis.add(domain);
        } catch {}
      }
    },
  });
  
  return Array.from(apis);
}

/**
 * Detect code patterns
 */
function detectPatterns(ast: any, content: string): string[] {
  const patterns = new Set<string>();
  
  // Async patterns
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.async) patterns.add('async');
    },
    ArrowFunctionExpression(path) {
      if (path.node.async) patterns.add('async');
    },
    AwaitExpression() {
      patterns.add('async');
    },
  });
  
  // Promise patterns
  if (content.includes('Promise') || content.includes('.then(')) {
    patterns.add('promises');
  }
  
  // Event handling
  if (content.includes('addEventListener') || content.includes('on(')) {
    patterns.add('events');
  }
  
  // State management
  if (content.includes('useState') || content.includes('state')) {
    patterns.add('state-management');
  }
  
  // API patterns
  if (content.includes('fetch') || content.includes('axios')) {
    patterns.add('api-calls');
  }
  
  // Authentication patterns
  if (content.match(/auth|login|token|jwt|oauth/i)) {
    patterns.add('authentication');
  }
  
  // Database patterns
  if (content.match(/query|insert|update|delete|select/i)) {
    patterns.add('database');
  }
  
  return Array.from(patterns);
}

/**
 * Check if code has documentation
 */
function hasDocumentation(content: string): boolean {
  // Check for JSDoc comments
  if (content.includes('/**')) return true;
  
  // Check for README references
  if (content.match(/readme|documentation|docs/i)) return true;
  
  return false;
}

/**
 * Normalize code formatting
 */
function normalizeCode(ast: any, language: string): string {
  if (language === 'typescript' || language === 'javascript') {
    const { code } = generate(ast, {
      retainLines: false,
      compact: false,
      concise: false,
    });
    return code;
  }
  return '';
}

/**
 * Extract configurable variables
 */
function extractConfigurableVariables(ast: any): any[] {
  const variables: any[] = [];
  
  traverse(ast, {
    // Look for configuration objects
    VariableDeclarator(path) {
      if (path.node.id && t.isIdentifier(path.node.id)) {
        const name = path.node.id.name;
        if (name.match(/config|options|settings/i)) {
          // Extract properties if it's an object
          if (t.isObjectExpression(path.node.init)) {
            path.node.init.properties.forEach(prop => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                variables.push({
                  name: prop.key.name,
                  type: inferType(prop.value),
                  description: `Configuration option: ${prop.key.name}`,
                  defaultValue: extractDefaultValue(prop.value),
                });
              }
            });
          }
        }
      }
    },
    // Look for environment variables
    MemberExpression(path) {
      if (t.isIdentifier(path.node.object, { name: 'process' }) &&
          t.isIdentifier(path.node.property, { name: 'env' })) {
        const parent = path.parent;
        if (t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
          variables.push({
            name: parent.property.name,
            type: 'string',
            description: `Environment variable: ${parent.property.name}`,
          });
        }
      }
    },
  });
  
  return variables;
}

/**
 * Find injection points for customization
 */
function findInjectionPoints(ast: any): any[] {
  const points: any[] = [];
  let pointId = 0;
  
  traverse(ast, {
    // Function bodies are good injection points
    FunctionDeclaration(path) {
      if (path.node.id) {
        points.push({
          id: `injection-${++pointId}`,
          description: `Before function ${path.node.id.name}`,
          type: 'before',
          location: `function:${path.node.id.name}:start`,
        });
        points.push({
          id: `injection-${++pointId}`,
          description: `After function ${path.node.id.name}`,
          type: 'after',
          location: `function:${path.node.id.name}:end`,
        });
      }
    },
    // Class methods
    ClassMethod(path) {
      if (t.isIdentifier(path.node.key)) {
        points.push({
          id: `injection-${++pointId}`,
          description: `Before method ${path.node.key.name}`,
          type: 'before',
          location: `method:${path.node.key.name}:start`,
        });
      }
    },
  });
  
  // Check for comments manually since Comment visitor is no longer supported
  if (ast.comments) {
    ast.comments.forEach((comment: any, index: number) => {
      if (comment.value.includes('@inject') || comment.value.includes('INJECT')) {
        points.push({
          id: `injection-${++pointId}`,
          description: comment.value.replace(/@inject|INJECT/g, '').trim(),
          type: 'replace',
          location: `comment:${comment.loc?.start.line || index}`,
        });
      }
    });
  }
  
  return points;
}

/**
 * Find patterns that can be adapted
 */
function findAdaptablePatterns(ast: any, content: string): any[] {
  const patterns: any[] = [];
  
  // Naming conventions
  const namingStyle = detectNamingConvention(ast);
  if (namingStyle) {
    patterns.push({
      type: 'naming',
      current: namingStyle,
      description: 'Variable and function naming convention',
    });
  }
  
  // Import style
  const importStyle = detectImportStyle(ast);
  if (importStyle) {
    patterns.push({
      type: 'imports',
      current: importStyle,
      description: 'Module import style',
    });
  }
  
  // Error handling
  const errorStyle = detectErrorHandling(ast);
  if (errorStyle) {
    patterns.push({
      type: 'error-handling',
      current: errorStyle,
      description: 'Error handling approach',
    });
  }
  
  return patterns;
}

/**
 * Helper functions
 */

function inferType(node: any): string {
  if (t.isStringLiteral(node)) return 'string';
  if (t.isNumericLiteral(node)) return 'number';
  if (t.isBooleanLiteral(node)) return 'boolean';
  if (t.isArrayExpression(node)) return 'array';
  if (t.isObjectExpression(node)) return 'object';
  return 'unknown';
}

function extractDefaultValue(node: any): string | undefined {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isBooleanLiteral(node)) return String(node.value);
  return undefined;
}

function detectNamingConvention(ast: any): string | undefined {
  const identifiers: string[] = [];
  
  traverse(ast, {
    Identifier(path) {
      if (path.isReferencedIdentifier()) {
        identifiers.push(path.node.name);
      }
    },
  });
  
  // Check patterns
  const camelCount = identifiers.filter(id => /^[a-z][a-zA-Z0-9]*$/.test(id)).length;
  const snakeCount = identifiers.filter(id => /^[a-z]+_[a-z]+/.test(id)).length;
  const pascalCount = identifiers.filter(id => /^[A-Z][a-zA-Z0-9]*$/.test(id)).length;
  
  if (camelCount > snakeCount && camelCount > pascalCount) return 'camelCase';
  if (snakeCount > camelCount) return 'snake_case';
  if (pascalCount > camelCount) return 'PascalCase';
  
  return undefined;
}

function detectImportStyle(ast: any): string | undefined {
  let namedImports = 0;
  let defaultImports = 0;
  
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.specifiers.some(s => t.isImportDefaultSpecifier(s))) {
        defaultImports++;
      }
      if (path.node.specifiers.some(s => t.isImportSpecifier(s))) {
        namedImports++;
      }
    },
  });
  
  if (namedImports > defaultImports) return 'named';
  if (defaultImports > namedImports) return 'default';
  return 'mixed';
}

function detectErrorHandling(ast: any): string | undefined {
  let tryCount = 0;
  let throwCount = 0;
  let promiseCatch = 0;
  
  traverse(ast, {
    TryStatement() {
      tryCount++;
    },
    ThrowStatement() {
      throwCount++;
    },
    CallExpression(path) {
      if (t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.property, { name: 'catch' })) {
        promiseCatch++;
      }
    },
  });
  
  if (tryCount > 0) return 'exceptions';
  if (promiseCatch > 0) return 'promises';
  return undefined;
}

/**
 * Generate description from analysis
 */
function generateDescription(analysis: CodeAnalysis): string {
  const parts: string[] = [];
  
  if (analysis.framework) {
    parts.push(`${analysis.framework} component`);
  } else {
    parts.push(`${analysis.language} module`);
  }
  
  if (analysis.patterns.includes('authentication')) {
    parts.push('for authentication');
  } else if (analysis.patterns.includes('api-calls')) {
    parts.push('for API integration');
  } else if (analysis.patterns.includes('database')) {
    parts.push('for database operations');
  }
  
  if (analysis.apis.length > 0) {
    parts.push(`integrating with ${analysis.apis.join(', ')}`);
  }
  
  return parts.join(' ');
}

/**
 * Generate primary prompt for matching
 */
function generatePrimaryPrompt(analysis: CodeAnalysis): string {
  const parts: string[] = [analysis.name, analysis.description];
  
  if (analysis.framework) {
    parts.push(`using ${analysis.framework}`);
  }
  
  parts.push(...analysis.patterns);
  parts.push(...analysis.tags);
  
  return parts.join(' ');
}

/**
 * Generate prompt variants
 */
function generatePromptVariants(analysis: CodeAnalysis): string[] {
  const variants: string[] = [];
  
  // Different ways to describe the same component
  if (analysis.patterns.includes('authentication')) {
    variants.push('user login system');
    variants.push('auth implementation');
    variants.push('sign in functionality');
  }
  
  if (analysis.patterns.includes('api-calls')) {
    variants.push('API client');
    variants.push('HTTP integration');
    variants.push('REST API wrapper');
  }
  
  return variants;
}

/**
 * Generate searchable tags
 */
function generateTags(analysis: CodeAnalysis): string[] {
  const tags = new Set<string>();
  
  // Add language and framework
  tags.add(analysis.language);
  if (analysis.framework) tags.add(analysis.framework);
  
  // Add patterns
  analysis.patterns.forEach(p => tags.add(p));
  
  // Add dependencies
  analysis.dependencies.forEach(d => tags.add(d));
  
  // Add descriptive tags
  if (analysis.patterns.includes('authentication')) {
    tags.add('auth');
    tags.add('login');
    tags.add('security');
  }
  
  return Array.from(tags);
}
