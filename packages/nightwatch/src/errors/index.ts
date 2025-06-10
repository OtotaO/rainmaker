// Export the base error class
export { default as NightwatchError } from './base-error';

// Export all core errors
export * from './core-errors';

// Export all HTTP errors
export * from './http-errors';

// Export types and type guard
export { isNightwatchError } from './types';
export type { NightwatchErrorOptions, INightwatchError } from './types';

// Create a default export with all errors
import NightwatchError from './base-error';
import * as core from './core-errors';
import * as http from './http-errors';
import { isNightwatchError } from './types';

const allExports = {
  NightwatchError,
  ...core,
  ...http,
  isNightwatchError,
};

export default allExports;
