import { z, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  errorMessages?: string[]; // General error messages not tied to specific fields
}

/**
 * Validates data against a Zod schema and returns a structured result.
 * @param schema The Zod schema to validate against.
 * @param data The data to validate.
 * @returns ValidationResult object.
 */
export function validateSchema<T>(
  schema: z.ZodType<T, any, any>,
  data: unknown
): ValidationResult<T> {
  try {
    const parsedData = schema.parse(data);
    return { success: true, data: parsedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      const generalErrors: string[] = [];

      error.errors.forEach((err) => {
        if (err.path && err.path.length > 0) {
          const field = err.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        } else {
          generalErrors.push(err.message);
        }
      });
      return {
        success: false,
        errors: fieldErrors,
        errorMessages: generalErrors.length > 0 ? generalErrors : undefined,
      };
    }
    // Handle non-Zod errors, though schema.parse should only throw ZodError
    console.error("Unexpected validation error:", error);
    return {
      success: false,
      errorMessages: ['An unexpected validation error occurred.'],
    };
  }
}

/**
 * Formats Zod errors into a user-friendly string.
 * @param errors Record of field errors.
 * @param errorMessages Array of general error messages.
 * @returns A string summarizing the validation errors.
 */
export function formatValidationErrors(
  errors?: Record<string, string[]>,
  errorMessages?: string[]
): string {
  let message = "Validation failed:\n";
  if (errors) {
    for (const field in errors) {
      message += `- ${field}: ${errors[field].join(', ')}\n`;
    }
  }
  if (errorMessages) {
    message += errorMessages.join('\n');
  }
  return message.trim();
}
