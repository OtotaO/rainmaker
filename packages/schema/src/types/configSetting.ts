import { z } from 'zod';

/**
 * Schema for application configuration settings
 * This schema is used for both API validation and as a conceptual model for Dafny verification
 */
export const ConfigSettingSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1, "Key cannot be empty").max(255, "Key too long"),  
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
  category: z.string().optional(),
  isEncrypted: z.boolean().default(false),
  lastModified: z.date().optional(),
  version: z.number().int().positive().default(1)
});

export type ConfigSetting = z.infer<typeof ConfigSettingSchema>;
