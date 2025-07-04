/**
 * Adaptation Service Wrapper for API
 * 
 * This provides a simpler interface for code adaptation
 * without requiring the full AdaptationEngine complexity.
 */

import { Component } from '@rainmaker/discovery/src/types';

export interface SimpleAdaptationOptions {
  namingConvention?: 'camelCase' | 'snake_case' | 'kebab-case';
  importStyle?: 'default' | 'named' | 'namespace';
  errorHandling?: 'try-catch' | 'promises' | 'async-await' | 'result-type';
  customInjections?: Array<{
    type: 'before' | 'after' | 'replace' | 'wrap';
    target: string;
    code: string;
  }>;
}

export class AdaptationWrapper {
  /**
   * Adapt component code based on options
   */
  async adapt(
    component: Component,
    options: SimpleAdaptationOptions
  ): Promise<string> {
    let code = component.code.raw;
    
    // Apply naming convention changes
    if (options.namingConvention) {
      code = this.applyNamingConvention(code, options.namingConvention);
    }
    
    // Apply import style changes
    if (options.importStyle) {
      code = this.applyImportStyle(code, options.importStyle);
    }
    
    // Apply error handling changes
    if (options.errorHandling) {
      code = this.applyErrorHandling(code, options.errorHandling);
    }
    
    // Apply custom injections
    if (options.customInjections) {
      for (const injection of options.customInjections) {
        code = this.applyInjection(code, injection);
      }
    }
    
    return code;
  }
  
  private applyNamingConvention(code: string, convention: string): string {
    // Simple demonstration - in production, use proper AST transformation
    if (convention === 'snake_case') {
      // Convert camelCase to snake_case
      return code.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    } else if (convention === 'kebab-case') {
      // Convert camelCase to kebab-case
      return code.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
    return code;
  }
  
  private applyImportStyle(code: string, style: string): string {
    // Simple demonstration - in production, use proper AST transformation
    if (style === 'named') {
      // Convert default imports to named imports
      return code.replace(
        /import\s+(\w+)\s+from\s+['"](.+)['"]/g,
        "import { $1 } from '$2'"
      );
    } else if (style === 'namespace') {
      // Convert to namespace imports
      return code.replace(
        /import\s+(\w+)\s+from\s+['"](.+)['"]/g,
        "import * as $1 from '$2'"
      );
    }
    return code;
  }
  
  private applyErrorHandling(code: string, style: string): string {
    // Simple demonstration - in production, use proper AST transformation
    if (style === 'async-await') {
      // Convert .then/.catch to async/await
      return code.replace(
        /\.then\s*\(\s*(\w+)\s*=>\s*{([^}]+)}\s*\)/g,
        'await $1; $2'
      );
    }
    return code;
  }
  
  private applyInjection(
    code: string,
    injection: { type: string; target: string; code: string }
  ): string {
    const lines = code.split('\n');
    const targetIndex = lines.findIndex(line => line.includes(injection.target));
    
    if (targetIndex === -1) return code;
    
    switch (injection.type) {
      case 'before':
        lines.splice(targetIndex, 0, injection.code);
        break;
      case 'after':
        lines.splice(targetIndex + 1, 0, injection.code);
        break;
      case 'replace':
        lines[targetIndex] = injection.code;
        break;
      case 'wrap':
        lines[targetIndex] = `${injection.code}\n${lines[targetIndex]}\n${injection.code}`;
        break;
    }
    
    return lines.join('\n');
  }
}
