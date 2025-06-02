import { z } from 'zod';

/**
 * Valid sender roles for Anthropic messages.
 * Defining as literals avoids z.enum to keep schemas fully JSON-serializable.
 */
export const MessageRoleUser = z.literal('user');
export const MessageRoleAssistant = z.literal('assistant');
export const MessageRoleSchema = z.union([
  MessageRoleUser,
  MessageRoleAssistant,
]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * Generic status values used across the codebase.
 */
export const StatusActive = z.literal('active');
export const StatusInactive = z.literal('inactive');
export const StatusSchema = z.union([
  StatusActive,
  StatusInactive,
]);
export type Status = z.infer<typeof StatusSchema>;
