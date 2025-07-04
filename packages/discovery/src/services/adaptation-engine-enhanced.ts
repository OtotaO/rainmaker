/**
 * Enhanced Code Adaptation Engine with LLM-powered Transformation Suggestions
 * 
 * Intelligently transforms code to match user requirements using AI to suggest
 * the best transformations for the target context.
 */

import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse'; // Import NodePath
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
import { b } from '../../baml_client'; // Assuming 'b' is the BAML client instance
import type { 
  BamlSuggestCodeTransformationsOutput, 
  BAMLAdaptationClientMethods 
} from '../types/baml'; // Import new BAML types

export interface EnhancedAdaptationOptions {
  useLLMSuggestions?: boolean;
  autoApplySuggestions?: boolean;
  suggestionConfidenceThreshold?: number;
}

export class EnhancedAdaptationEngine {
  private options: Required<EnhancedAdaptationOptions>;
  private bamlClient: BAMLAdaptationClientMethods; // Type the BAML client
  
  constructor(options: EnhancedAdaptationOptions = {}) {
    this.options = {
      useLLMSuggestions: options.useLLMSuggestions ?? true,
      autoApplySuggestions: options.autoApplySuggestions ?? false,
      suggestionConfidenceThreshold: options.suggestionConfidenceThreshold ?? 0.7,
    };
    this.bamlClient = b as BAMLAdaptationClientMethods; // Cast the imported 'b'
  }
  
  /**
   * Generate an enhanced adaptation plan using LLM suggestions
   */
  async generateEnhancedPlan(
    component: Component,
    context: UserContext,
    customizations?: Record<string, string> // Type customizations
  ): Promise<AdaptationPlan> {
    logger.info(`Generating enhanced adaptation plan for: ${component.metadata.id}`);
    
    // Start with basic plan
    const plan: AdaptationPlan = {
      component: component.metadata.id,
      transformations: [],
      additions: [],
    };
    
    // Add basic transformations (naming conventions, etc.)
    this.addBasicTransformations(plan, component, context);
    
    // If LLM suggestions are enabled, get intelligent recommendations
    if (this.options.useLLMSuggestions) {
      try {
        const suggestions = await this.getLLMSuggestions(component, context, customizations);
        
        if (suggestions) {
          // Add LLM-suggested transformations to the plan
          this.integrateTransformationSuggestions(plan, suggestions);
        }
      } catch (error) {
        logger.warn('Failed to get LLM transformation suggestions, using basic plan:', error);
      }
    }
    
    // Apply user customizations
    if (customizations) {
      this.addCustomizations(plan, component, customizations);
    }
    
    return plan;
  }
  
  /**
   * Get LLM suggestions for code transformations
   */
  private async getLLMSuggestions(
    component: Component,
    context: UserContext,
    customizations?: Record<string, string> // Type customizations
  ): Promise<BamlSuggestCodeTransformationsOutput> { // Type return
    // Prepare target patterns based on context
    const targetPatterns = [
      `${context.project.conventions.naming} naming convention`,
      `${context.project.conventions.imports} import style`,
      `${context.project.conventions.exports} export style`,
    ];
    
    if (context.preferences.style) {
      targetPatterns.push(`${context.preferences.style} programming style`);
    }
    
    if (context.preferences.errorHandling) {
      targetPatterns.push(`${context.preferences.errorHandling} error handling`);
    }
    
    if (context.preferences.asyncPattern) {
      targetPatterns.push(`${context.preferences.asyncPattern} async pattern`);
    }
    
    // Prepare constraints
    const constraints = [];
    
    if (context.project.framework) {
      constraints.push(`Must work with ${context.project.framework} framework`);
    }
    
    if (context.dependencies) {
      const deps = Object.keys(context.dependencies);
      if (deps.length > 0) {
        constraints.push(`Compatible with existing dependencies: ${deps.slice(0, 5).join(', ')}`);
      }
    }
    
    if (customizations) {
      constraints.push(`User customizations: ${JSON.stringify(customizations)}`);
    }
    
    // Call LLM for suggestions
    const suggestions = await b.SuggestCodeTransformations(
      component.code.raw,
      targetPatterns,
      context.project.framework || undefined,
      constraints
    );
    
    logger.debug('LLM transformation suggestions:', {
      structural: suggestions.structural_changes.length,
      patterns: suggestions.pattern_adaptations.length,
      framework: suggestions.framework_modifications.length,
      config: suggestions.configuration_updates.length,
      integration: suggestions.integration_points.length,
    });
    
    return suggestions;
  }
  
  /**
   * Add basic transformations based on context differences
   */
  private addBasicTransformations(
    plan: AdaptationPlan,
    component: Component,
    context: UserContext
  ): void {
    // Naming convention transformation
    const sourceNaming = component.customization.patterns.find(p => p.type === 'naming');
    if (sourceNaming && sourceNaming.current !== context.project.conventions.naming) {
      plan.transformations.push({
        type: 'pattern',
        pattern: 'naming',
        from: sourceNaming.current,
        to: context.project.conventions.naming,
      });
    }
    
    // Import style transformation
    const sourceImports = component.customization.patterns.find(p => p.type === 'imports');
    if (sourceImports && sourceImports.current !== context.project.conventions.imports) {
      plan.transformations.push({
        type: 'pattern',
        pattern: 'imports',
        from: sourceImports.current,
        to: context.project.conventions.imports,
      });
    }
    
    // Error handling pattern
    const sourceErrorHandling = component.customization.patterns.find(p => p.type === 'error-handling');
    if (sourceErrorHandling && context.preferences.errorHandling && 
        sourceErrorHandling.current !== context.preferences.errorHandling) {
      plan.transformations.push({
        type: 'pattern',
        pattern: 'error-handling',
        from: sourceErrorHandling.current,
        to: context.preferences.errorHandling,
      });
    }
  }
  
  /**
   * Integrate LLM suggestions into the adaptation plan
   */
  private integrateTransformationSuggestions(plan: AdaptationPlan, suggestions: BamlSuggestCodeTransformationsOutput): void { // Type suggestions
    // Process structural changes
    for (const change of suggestions.structural_changes) {
      if (change.priority === 'high' || this.options.autoApplySuggestions) {
        // Convert LLM suggestion to transformation
        if (change.type === 'refactor' && change.code_example) {
          plan.transformations.push({
            type: 'inject',
            point: 'main', // Would need to identify injection point
            code: change.code_example,
            position: 'replace',
          });
        }
      }
    }
    
    // Process pattern adaptations
    for (const adaptation of suggestions.pattern_adaptations) {
      if (adaptation.priority === 'high') {
        // These map directly to our pattern transformations
        const parsedAdaptation = this.parsePatternAdaptation(adaptation);
        if (parsedAdaptation) { // Add null check
          const [patternType, from, to] = parsedAdaptation;
          plan.transformations.push({
            type: 'pattern',
            pattern: patternType,
            from,
            to,
          });
        }
      }
    }
    
    // Process framework modifications
    for (const mod of suggestions.framework_modifications) {
      if (mod.priority === 'high' || mod.priority === 'medium') {
        // Framework changes often involve import replacements
        if (mod.type === 'import-change' && mod.code_example) {
          const importChange = this.parseImportChange(mod.code_example);
          if (importChange) {
            plan.transformations.push({
              type: 'replace-import',
              from: importChange.from,
              to: importChange.to,
              importStyle: importChange.style,
            });
          }
        } else if (mod.type === 'api-update' && mod.code_example) {
          // API updates might need code injection
          plan.transformations.push({
            type: 'inject',
            point: 'api-usage', // Would need to identify where APIs are used
            code: mod.code_example,
            position: 'replace',
          });
        }
      }
    }
    
    // Process configuration updates
    for (const config of suggestions.configuration_updates) {
      if (config.priority === 'high' || this.options.autoApplySuggestions) {
        // Extract variable name and value from description
        const configUpdate = this.parseConfigUpdate(config);
        if (configUpdate) {
          plan.transformations.push({
            type: 'configure',
            variable: configUpdate.variable,
            value: configUpdate.value,
          });
        }
      }
    }
    
    // Process integration points
    for (const integration of suggestions.integration_points) {
      if (integration.priority === 'high') {
        // Integration points might need additional files
        if (integration.code_example) {
          plan.additions = plan.additions || [];
          plan.additions.push({
            path: this.generateIntegrationFilename(integration),
            content: integration.code_example,
            description: integration.description,
          });
        }
      }
    }
  }
  
  /**
   * Add user customizations to the plan
   */
  private addCustomizations(
    plan: AdaptationPlan,
    component: Component,
    customizations: Record<string, string> // Type customizations
  ): void {
    for (const [key, value] of Object.entries(customizations)) {
      const variable = component.customization.variables.find(v => v.name === key);
      if (variable) {
        plan.transformations.push({
          type: 'configure',
          variable: key,
          value: String(value),
        });
      }
    }
  }
  
  /**
   * Adapt a component based on the enhanced plan
   */
  async adapt(
    component: Component,
    plan: AdaptationPlan,
    context: UserContext
  ): Promise<AdaptedComponent> {
    logger.info(`Adapting component with enhanced engine: ${component.metadata.id}`);
    
    let code = component.code.raw;
    const files: Array<{ path: string; content: string; description: string }> = [];
    
    // Parse the code
    const ast: t.File = parser.parse(code, { // Type AST as t.File
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    
    // Apply transformations in order
    for (const transformation of plan.transformations) {
      // Use type guards to narrow down transformation type
      switch (transformation.type) {
        case 'rename':
          this.applyRename(ast, transformation);
          break;
          
        case 'replace-import':
          this.applyImportReplace(ast, transformation);
          break;
          
        case 'inject':
          this.applyInjection(ast, transformation, component); // Re-add component argument
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
      for (const addition of plan.additions) {
        const formattedAddition = await this.formatCode(addition.content, context);
        files.push({
          ...addition,
          content: formattedAddition,
        });
      }
    }
    
    // Generate enhanced setup instructions
    const instructions = this.generateEnhancedInstructions(component, plan, context);
    
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
   * Parse pattern adaptation from LLM suggestion
   */
  private parsePatternAdaptation(adaptation: any): [string, string, string] | null {
    const description = adaptation.description.toLowerCase();
    
    if (description.includes('naming convention')) {
      // Extract from/to from description or code example
      if (description.includes('camelcase') && description.includes('snake_case')) {
        return ['naming', 'camelCase', 'snake_case'];
      } else if (description.includes('snake_case') && description.includes('camelcase')) {
        return ['naming', 'snake_case', 'camelCase'];
      }
    } else if (description.includes('error handling')) {
      if (description.includes('try-catch') && description.includes('promise')) {
        return ['error-handling', 'exceptions', 'promises'];
      } else if (description.includes('promise') && description.includes('async')) {
        return ['error-handling', 'promises', 'async-await'];
      }
    }
    
    return null;
  }
  
  /**
   * Parse import change from code example
   */
  private parseImportChange(codeExample: string): { from: string; to: string; style?: 'named' | 'default' | 'namespace' } | null {
    // Simple regex to extract import statements
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    const matches = [...codeExample.matchAll(importRegex)];
    
    if (matches.length >= 2) {
      const match1 = matches[0];
      const match2 = matches[1];

      // Ensure matches are not null/undefined before destructuring
      if (!match1 || !match2) return null;
      
      const [, namedImports1, defaultImport1, module1] = match1;
      const [, namedImports2, defaultImport2, module2] = match2;
      
      let style: 'named' | 'default' | 'namespace' | undefined;
      if (namedImports2) {
        style = 'named';
      } else if (defaultImport2) {
        style = 'default';
      } else {
        // If neither named nor default, it might be a namespace import or just a side-effect import
        // For now, default to undefined or add more sophisticated detection
        style = undefined; 
      }

      return {
        from: module1,
        to: module2,
        style,
      };
    }
    
    return null;
  }
  
  /**
   * Parse configuration update from suggestion
   */
  private parseConfigUpdate(config: any): { variable: string; value: string } | null {
    // Try to extract variable name and value from description
    const match = config.description.match(/set\s+(\w+)\s+to\s+(.+)/i);
    if (match && match[1] && match[2]) { // Add null/undefined checks for match groups
      return {
        variable: match[1] as string, // Explicitly cast to string
        value: (match[2].trim().replace(/['"]/g, '')) as string, // Explicitly cast to string
      };
    }
    
    // Try to parse from code example
    if (config.code_example) {
      const configMatch = config.code_example.match(/(\w+):\s*['"]?([^'",\s}]+)/);
      if (configMatch) {
        return {
          variable: configMatch[1],
          value: configMatch[2],
        };
      }
    }
    
    return null;
  }
  
  /**
   * Generate filename for integration file
   */
  private generateIntegrationFilename(integration: any): string {
    const type = integration.type || 'integration';
    const description = integration.description.toLowerCase();
    
    if (description.includes('config')) {
      return 'config.ts';
    } else if (description.includes('setup')) {
      return 'setup.ts';
    } else if (description.includes('hook')) {
      return 'hooks.ts';
    } else if (description.includes('util')) {
      return 'utils.ts';
    }
    
    return `${type}.ts`;
  }
  
  /**
   * Generate enhanced setup instructions with LLM insights
   */
  private generateEnhancedInstructions(
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
    
    // Add setup steps from plan additions
    if (plan.additions) {
      for (const addition of plan.additions) {
        if (addition.description.toLowerCase().includes('config')) {
          setup.push(`Configure settings in ${addition.path}`);
        } else if (addition.description.toLowerCase().includes('env')) {
          setup.push(`Set environment variables as shown in ${addition.path}`);
        }
      }
    }
    
    // Environment variables from configurations
    const envVars = plan.transformations
      .filter(t => t.type === 'configure')
      .map(t => t.variable);
    
    if (envVars.length > 0) {
      setup.push(`Set environment variables: ${envVars.join(', ')}`);
    }
    
    // Framework-specific setup
    const frameworkMods = plan.transformations.filter(t => 
      t.type === 'replace-import' || (t.type === 'inject' && t.point === 'api-usage')
    );
    
    if (frameworkMods.length > 0 && context.project.framework) {
      setup.push(`Ensure ${context.project.framework} is properly configured`);
    }
    
    // Usage example
    const usage = this.generateUsageExample(component, context);
    
    return { install, setup, usage };
  }
  
  // Include all the transformation methods from the original AdaptationEngine
  // (applyRename, applyImportReplace, applyInjection, etc.)
  // These remain the same as in the original implementation
  
  /**
   * Apply rename transformation
   */
  private applyRename(ast: t.File, transformation: AdaptationPlan['transformations'][number]): void {
    if (transformation.type !== 'rename') return; // Type guard
    traverse(ast, {
      Identifier(path: NodePath<t.Identifier>) { // Type path
        if (path.node.name === transformation.from) {
          path.node.name = transformation.to;
        }
      },
    });
  }
  
  /**
   * Apply import replacement
   */
  private applyImportReplace(ast: t.File, transformation: AdaptationPlan['transformations'][number]): void {
    if (transformation.type !== 'replace-import') return; // Type guard
    traverse(ast, {
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) { // Type path
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
  private applyInjection(ast: t.File, transformation: AdaptationPlan['transformations'][number], component: Component): void { // Re-add component argument
    if (transformation.type !== 'inject') return; // Type guard
    
    const injectionPoint = component.customization.injectionPoints.find(
      p => p.id === transformation.point
    );
    
    if (!injectionPoint) {
      logger.warn(`Injection point not found: ${transformation.point}`);
      return;
    }
    
    // Parse the code to inject
    const codeToInject: t.File = parser.parse(transformation.code, { // Type codeToInject
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    
    // Find the injection location and apply
    const self = this;
    traverse(ast, {
      enter(path: NodePath<t.Node>) { // Type path
        if (self.matchesLocation(path, injectionPoint.location)) { // Use injectionPoint.location
          switch (transformation.position) {
            case 'before':
              self.injectBefore(path as NodePath<t.FunctionDeclaration | t.ClassMethod>, codeToInject);
              break;
            case 'after':
              self.injectAfter(path as NodePath<t.FunctionDeclaration | t.ClassMethod>, codeToInject);
              break;
            case 'replace':
              self.injectReplace(path as NodePath<t.FunctionDeclaration | t.ClassMethod>, codeToInject);
              break;
            case 'wrap':
              self.injectWrap(path as NodePath<t.FunctionDeclaration | t.ClassMethod>, codeToInject);
              break;
          }
        }
      },
    });
  }
  
  /**
   * Apply pattern changes (naming conventions, etc)
   */
  private applyPatternChange(ast: t.File, transformation: AdaptationPlan['transformations'][number], context: UserContext): void {
    if (transformation.type !== 'pattern') return; // Type guard
    if (transformation.pattern === 'naming') {
      // Convert between naming conventions
      traverse(ast, {
        Identifier(path: NodePath<t.Identifier>) { // Type path
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
  private applyConfiguration(ast: t.File, transformation: AdaptationPlan['transformations'][number]): void {
    if (transformation.type !== 'configure') return; // Type guard
    traverse(ast, {
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) { // Type path
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
  
  // Include all helper methods from original implementation
  private convertErrorHandling(ast: t.File, from: string, to: string): void { // Type ast
    // Implementation from original
  }
  
  private matchesLocation(path: NodePath<t.Node>, location: string): boolean { // Type path
    const [type, name] = location.split(':');
    
    if (type === 'function' && path.isFunctionDeclaration()) {
      return path.node.id?.name === name;
    } else if (type === 'method' && path.isClassMethod()) {
      return t.isIdentifier(path.node.key) && path.node.key.name === name;
    }
    
    return false;
  }
  
  private injectBefore(path: NodePath<t.FunctionDeclaration | t.ClassMethod>, code: t.File): void { // Type path and code
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body.unshift(...code.program.body);
      }
    }
  }
  
  private injectAfter(path: NodePath<t.FunctionDeclaration | t.ClassMethod>, code: t.File): void { // Type path and code
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body.push(...code.program.body);
      }
    }
  }
  
  private injectReplace(path: NodePath<t.FunctionDeclaration | t.ClassMethod>, code: t.File): void { // Type path and code
    if (path.isFunctionDeclaration() || path.isClassMethod()) {
      const body = path.node.body;
      if (t.isBlockStatement(body)) {
        body.body = code.program.body;
      }
    }
  }
  
  private injectWrap(path: NodePath<t.FunctionDeclaration | t.ClassMethod>, code: t.File): void { // Type path and code
    // This would wrap the existing code with new code
    // Implementation depends on specific use case
    logger.debug('Wrap injection not yet implemented');
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
}

// Export factory function for easy migration
export function createEnhancedAdaptationEngine(
  options?: EnhancedAdaptationOptions
): EnhancedAdaptationEngine {
  return new EnhancedAdaptationEngine(options);
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
