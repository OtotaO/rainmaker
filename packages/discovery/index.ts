/**
 * Discovery Package Exports
 * 
 * Clean exports for the discovery system
 */

export { DiscoveryService } from './services/discovery-service';
export { discoveryContract } from './routes/discovery';
export { createDiscoveryRouter } from './routes/implementation';

// Export key types
export type {
  Component,
  ComponentMetadata,
  UserContext,
  SearchRequest,
  AdaptedComponent,
  DialogueNode,
  AdaptationPlan
} from './types';