/**
 * Code Adaptation Engine
 * 
 * Intelligently transforms code to match user requirements.
 * This is where the magic happens - taking generic components and making them fit perfectly.
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { format } from 'prettier';
import type { 
  Component, 
  AdaptationPlan, 
  UserContext, 
  AdaptedComponent 
} from '../types';
import { logger } from '../utils/logger';

export class AdaptationEngine {
  /**
   * Adapt a component based on the plan
   */
  async adapt(
    component: Component,
    plan: AdaptationPlan,
    context: UserContext
  ): Promise<AdaptedComponent> {
    logger.info(`Adapting component: ${component.metadata.id}`);
    
    let code = component.code.raw;
    const files: Array<{ path: string; content: string; description: string }> = [];
    
    // Parse the code
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    
    // Apply transformations in order
    for (const transformation of plan.transformations) {
      switch (transformation.type) {
        case 'rename':
          this.applyRename(ast, transformation);
          break;
          
        case 'replace-import':
          this.applyImportReplace(ast, transformation);
          break;
          
        case 'inject':
          this.applyInjection(ast, transformation, component);
          break;
          
        case 'pattern':
          this.applyPatternChange(ast, transformation, context);
          break;
          
        case 'configure':
          this.applyConfiguration(ast, transformation);
          break;
      }
    }
    
    // Generate the adapted code
    const { code: adaptedCode } = generate(ast, {
      retainLines: false,
      compact: false,
      concise: false,
    });
    
    // Format the code
    const formattedCode = await this.formatCode(adaptedCode, context);
    
    // Add the main file
    files.push({
      path: this.generateFilename(component, context),
      content: formattedCode,
      description: 'Main component file',
    });
    
    // Add additional files from the plan
    if (plan.additions) {
      files.push(...plan.additions);
    }
    
    // Generate setup instructions
    const instructions = this.generateInstructions(component, plan, context);
    
    // Create attribution
    const attribution = this.generateAttribution(component);
    
    return {
      original: component.metadata,
      adapted: {
        code: formattedCode,
        files,
        instructions,
        attribution,
      },
      plan,
    };
  }
  
  /**
   * Apply rename transformation
   */
  private applyRename(ast: any, transformation: any): void {
    traverse(ast, {
      Identifier(path) {
        if (path.node.name === transformation.from) {
          path.node.name = transformation.to;
        }
      },
    });
  }
  
  /**
   * Apply import replacement
   */
  private applyImportReplace(ast: any, transformation: any): void {
    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value === transformation.from) {
          path.node.source.value = transformation.to;
          
          // Update import style if specified
          if (transformation.importStyle === 'named' && path.node.specifiers.length === 1) {
            const spec = path.node.specifiers[0];
            if (t.isImportDefaultSpecifier(spec)) {
              // Convert default to named
              path.node.specifiers = [
                t.importSpecifier(
                  t.identifier(spec.local.name),
                  t.identifier(spec.local.name)
                ),
              ];
            }
          }
        }
      },
    });
  }
  
  /**
   * Apply code injection
   */
  private applyInjection(ast: any, transformation: any, component: Component): void {
    const injectionPoint = component.customization.injectionPoints.find(
      p => p.id === transformation.point
    );
    
    if (!injectionPoint) {
      logger.warn(`Injection point not found: ${transformation.point}`);
      return;
    }
    
    // Parse the code to inject
    const codeToInject = parser.parse(transformation.code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    
    // Find the injection location and apply
    const self = this;
    traverse(ast, {
      enter(path) {
        if (self.matchesLocation(path, injectionPoint.location)) {
          switch (transformation.position) {
            case 'before':
              self.injectBefore(path, codeToInject);
              break;
            case 'after':
              self.injectAfter(path, codeToInject);
              break;
            case 'replace':
              self.injectReplace(path, codeToInject);
              break;
            case 'wrap':
              self.injectWrap(path, codeToInject);
              break;
          }
        }
      },
    });
  }
  
  /**
   * Apply pattern changes (naming conventions, etc)
   */
  private applyPatternChange(ast: any, transformation: any, context: UserContext): void {
    if (transformation.pattern === 'naming') {
      // Convert between naming conventions
      traverse(ast, {
        Identifier(path) {
          // Check if this identifier should be renamed (skip built-ins and keywords)
          if (path.isReferencedIdentifier() && !isBuiltinIdentifier(path.node.name)) {
            path.node.name = convertNaming(
              path.node.name,
              transformation.from,
              transformation.to
            );
          }
        },
      });
    } else if (transformation.pattern === 'error-handling') {
      // Convert error handling patterns
      this.convertErrorHandling(ast, transformation.from, transformation.to);
    }
  }
  
  /**
   * Apply configuration changes
   */
  private applyConfiguration(ast: any, transformation: any): void {
    traverse(ast, {
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && 
            path.node.id.name.match(/config|options|settings/i)) {
          // Find the property and update its value
          if (t.isObjectExpression(path.node.init)) {
            const prop = path.node.init.properties.find(
              p => t.isObjectProperty(p) && 
                   t.isIdentifier(p.key) && 
                   p.key.name === transformation.variable
            );
            
            if (prop && t.isObjectProperty(prop)) {
              // Parse the new value
              const newValue = parser.parseExpression(transformation.value);
              prop.value = newValue;
            }
          }
        }
      },
    });
  }
  
  /**
   * Convert error handling patterns
   */
  private convertErrorHandling(ast: any, from: string, to: string): void {
    if (from === 'exceptions' && to === 'promises') {
      this.convertTryCatchToPromises(ast);
    } else if (from === 'promises' && to === 'async-await') {
      this.convertPromisesToAsyncAwait(ast);
    } else if (from === 'exceptions' && to === 'result-types') {
      this.convertTryCatchToResultTypes(ast);
    } else if (from === 'async-await' && to === 'promises') {
      this.convertAsyncAwaitToPromises(ast);
    }
  }

  /**
   * Convert try-catch blocks to promise chains
   */
  private convertTryCatchToPromises(ast: any): void {
    traverse(ast, {
      TryStatement(path) {
        const tryBlock = path.node.block;
        const catchClause = path.node.handler;
        const finallyBlock = path.node.finalizer;

        if (!catchClause) return;

        // Create a promise wrapper
        const promiseExpression = t.callExpression(
          t.memberExpression(
            t.identifier('Promise'),
            t.identifier('resolve')
          ),
          []
        );

        // Convert try block to .then()
        const thenCallback = t.arrowFunctionExpression(
          [],
          tryBlock
        );

        let chainExpression = t.callExpression(
          t.memberExpression(promiseExpression, t.identifier('then')),
          [thenCallback]
        );

        // Add catch handler
        if (catchClause.param && t.isIdentifier(catchClause.param)) {
          const catchCallback = t.arrowFunctionExpression(
            [catchClause.param],
            catchClause.body
          );
          chainExpression = t.callExpression(
            t.memberExpression(chainExpression, t.identifier('catch')),
            [catchCallback]
          );
        }

        // Add finally block if present
        if (finallyBlock) {
          const finallyCallback = t.arrowFunctionExpression(
            [],
            finallyBlock
          );
          chainExpression = t.callExpression(
            t.memberExpression(chainExpression, t.identifier('finally')),
            [finallyCallback]
          );
        }

        // Replace the try statement with the promise chain
        path.replaceWith(t.expressionStatement(chainExpression));
      },
    });
  }

  /**
   * Convert promise chains to async/await
   */
  private convertPromisesToAsyncAwait(ast: any): void {
    const self = this;
    traverse(ast, {
      CallExpression(path) {
        if (self.isPromiseChain(path.node)) {
          self.transformPromiseChainToAsyncAwait(path);
        }
      },
    });
  }

  /**
   * Convert try-catch to Result types (Either/Option pattern)
   */
  private convertTryCatchToResultTypes(ast: any): void {
    traverse(ast, {
      TryStatement(path) {
        const tryBlock = path.node.block;
        const catchClause = path.node.handler;

        if (!catchClause) return;

        // Wrap try block in a function that returns Result<T, E>
        const resultFunction = t.arrowFunctionExpression(
          [],
          t.blockStatement([
            ...tryBlock.body,
            t.returnStatement(
              t.callExpression(
                t.memberExpression(t.identifier('Result'), t.identifier('ok')),
                [t.identifier('result')] // Assumes result variable exists
              )
            )
          ])
        );

        // Create error handling
        const errorParam = catchClause.param && t.isIdentifier(catchClause.param) 
          ? catchClause.param 
          : t.identifier('error');
        const errorHandler = t.callExpression(
          t.memberExpression(t.identifier('Result'), t.identifier('error')),
          [errorParam]
        );

        // Replace with Result pattern
        const resultExpression = t.tryStatement(
          t.blockStatement([
            t.returnStatement(resultFunction)
          ]),
          t.catchClause(
            catchClause.param,
            t.blockStatement([
              t.returnStatement(errorHandler)
            ])
          )
        );

        path.replaceWith(resultExpression);
      },
    });
  }

  /**
   * Convert async/await back to promises
   */
  private convertAsyncAwaitToPromises(ast: any): void {
    traverse(ast, {
      AwaitExpression(path) {
        // Convert await expr to expr.then()
        const awaitedExpression = path.node.argument;
        
        // Find the containing function to transform
        const functionPath = path.getFunctionParent();
        if (functionPath && functionPath.node.async) {
          // This is complex - would need to restructure the entire function
          logger.debug('Converting async/await to promises - complex transformation');
        }
      },
    });
  }

  /**
   * Check if a call expression is a promise chain
   */
  private isPromiseChain(node: t.CallExpression): boolean {
    if (!t.isMemberExpression(node.callee)) return false;
    
    const property = node.callee.property;
    if (!t.isIdentifier(property)) return false;
    
    return ['then', 'catch', 'finally'].includes(property.name);
  }

  /**
   * Transform a promise chain to async/await
   */
  private transformPromiseChainToAsyncAwait(path: any): void {
    // This is a complex transformation that would need to:
    // 1. Identify the entire chain
    // 2. Extract the promise operations
    // 3. Convert to sequential await statements
    // 4. Handle error cases with try-catch
    
    logger.debug('Promise chain to async/await transformation - complex implementation needed');
  }
  
  /**
   * Format code according to user preferences
   */
  private async formatCode(code: string, context: UserContext): Promise<string> {
    try {
      return format(code, {
        parser: 'typescript',
        semi: true,
        singleQuote: context.project.conventions.naming !== 'snake_case',
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 100,
      });
    } catch (error) {
      logger.warn('Failed to format code:', error);
      return code;
    }
  }
  
  /**
   * Generate appropriate filename
   */
  private generateFilename(component: Component, context: UserContext): string {
    const name = component.metadata.name;
    const ext = context.project.language === 'typescript' ? '.ts' : '.js';
    
    // Apply naming convention
    const filename = convertNaming(name, 'PascalCase', context.project.conventions.naming);
    
    return `${filename}${ext}`;
  }
  
  /**
   * Generate setup instructions
   */
  private generateInstructions(
    component: Component,
    plan: AdaptationPlan,
    context: UserContext
  ): { install: string[]; setup: string[]; usage: string } {
    const install: string[] = [];
    const setup: string[] = [];
    
    // Package manager command
    const pm = context.project.packageManager || 'npm';
    const installCmd = pm === 'npm' ? 'npm install' : `${pm} add`;
    
    // Dependencies to install
    const depsToInstall = component.metadata.technical.dependencies.filter(
      dep => !context.dependencies[dep]
    );
    
    if (depsToInstall.length > 0) {
      install.push(`${installCmd} ${depsToInstall.join(' ')}`);
    }
    
    // Environment variables
    const envVars = plan.transformations
      .filter(t => t.type === 'configure')
      .map(t => t.variable);
    
    if (envVars.length > 0) {
      setup.push(`Set environment variables: ${envVars.join(', ')}`);
    }
    
    // Usage example
    const usage = this.generateUsageExample(component, context);
    
    return { install, setup, usage };
  }
  
  /**
   * Generate usage example
   */
  private generateUsageExample(component: Component, context: UserContext): string {
    const importStyle = context.project.conventions.imports;
    const componentName = component.metadata.name;
    
    if (importStyle === 'named') {
      return `import { ${componentName} } from './${componentName}';\n\n// Use the component\n${componentName}();`;
    } else {
      return `import ${componentName} from './${componentName}';\n\n// Use the component\n${componentName}();`;
    }
  }
  
  /**
   * Generate attribution text
   */
  private generateAttribution(component: Component): string {
    const { source } = component.metadata;
    return `// Adapted from ${source.repo} (${source.url})\n// License: ${source.license}\n// Original commit: ${source.commit}\n`;
  }
  
  /**
   * Helper methods for injection
   */
  
  private matchesLocation(path: any, location: string): boolean {
    const [type, name] = location.split(':');
    
    if (type === 'function' && path.isFunctionDeclaration()) {
      return path.node.id?.name === name;
    } else if (type === 'method' && path.isClassMethod()) {
      return t.isIdentifier(path.node.key) && path.node.key.name === name;
    }
    
    return false;
  }
  
  private injectBefore(path: any, code: any): void {
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body.unshift(...code.program.body);
      }
    }
  }
  
  private injectAfter(path: any, code: any): void {
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body.push(...code.program.body);
      }
    }
  }
  
  private injectReplace(path: any, code: any): void {
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body = code.program.body;
      }
    }
  }
  
  private injectWrap(path: any, code: any): void {
    // This would wrap the existing code with new code
    // Implementation depends on specific use case
    logger.debug('Wrap injection not yet implemented');
  }
}

/**
 * Check if an identifier is a built-in JavaScript/TypeScript identifier
 */
function isBuiltinIdentifier(name: string): boolean {
  const builtins = new Set([
    // JavaScript built-ins
    'console', 'window', 'document', 'global', 'process', 'Buffer',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
    'Promise', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError',
    'Math', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    // Common framework identifiers
    'React', 'Component', 'useState', 'useEffect', 'useContext',
    'Vue', 'computed', 'ref', 'reactive', 'watch',
    // Node.js built-ins
    'require', 'module', 'exports', '__dirname', '__filename',
    // TypeScript built-ins
    'any', 'unknown', 'never', 'void', 'undefined', 'null'
  ]);
  
  return builtins.has(name) || /^[A-Z][a-z]*$/.test(name); // Skip PascalCase (likely types)
}

/**
 * Convert between naming conventions
 */
function convertNaming(name: string, from: string, to: string): string {
  // First, split the name into words based on the source convention
  let words: string[] = [];
  
  if (from === 'camelCase') {
    words = name.split(/(?=[A-Z])/).map(w => w.toLowerCase());
  } else if (from === 'snake_case') {
    words = name.split('_');
  } else if (from === 'kebab-case') {
    words = name.split('-');
  } else if (from === 'PascalCase') {
    words = name.split(/(?=[A-Z])/).map(w => w.toLowerCase());
    if (words[0] === '') words.shift();
  }
  
  // Then, join them according to the target convention
  if (to === 'camelCase') {
    return words.map((w, i) => i === 0 ? w : capitalize(w)).join('');
  } else if (to === 'snake_case') {
    return words.join('_').toLowerCase();
  } else if (to === 'kebab-case') {
    return words.join('-').toLowerCase();
  } else if (to === 'PascalCase') {
    return words.map(capitalize).join('');
  }
  
  return name;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
