/**
 * Base Zod import to avoid circular dependencies
 * This file imports the real Zod library directly from node_modules
 */
// Direct import to bypass path mapping
import { z } from '../../../node_modules/zod/lib/index.js';
export { z };
export type * from '../../../node_modules/zod/lib/index.js';