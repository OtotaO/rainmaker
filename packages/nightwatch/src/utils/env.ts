import { logger } from './logger';

type EnvVarType = 'string' | 'number' | 'boolean' | 'json' | 'array';

interface EnvVarOptions<T> {
  required?: boolean;
  default?: T;
  type?: EnvVarType;
  allowedValues?: T[];
  validator?: (value: T) => boolean | string;
}

/**
 * Get an environment variable with type safety and validation
 */
function env<T = string>(
  key: string,
  options: EnvVarOptions<T> = {}
): T | undefined {
  const {
    required = false,
    default: defaultValue,
    type = 'string',
    allowedValues,
    validator,
  } = options;

  const value = process.env[key];

  // Return default value if environment variable is not set
  if (value === undefined || value === '') {
    if (required && defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return defaultValue;
  }

  let parsedValue: any = value;

  // Parse value based on type
  try {
    switch (type) {
      case 'number':
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
          throw new Error(`Environment variable ${key} must be a valid number`);
        }
        break;

      case 'boolean':
        parsedValue = value.toLowerCase() === 'true' || value === '1';
        break;

      case 'json':
        try {
          parsedValue = JSON.parse(value);
        } catch (error) {
          throw new Error(`Environment variable ${key} contains invalid JSON`);
        }
        break;

      case 'array':
        try {
          // Support comma-separated strings or JSON arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            parsedValue = JSON.parse(value);
          } else {
            parsedValue = value.split(',').map((item) => item.trim());
          }
          if (!Array.isArray(parsedValue)) {
            throw new Error(`Environment variable ${key} must be an array`);
          }
        } catch (error) {
          throw new Error(`Failed to parse array from environment variable ${key}`);
        }
        break;

      case 'string':
      default:
        // No special parsing needed for strings
        break;
    }

    // Validate against allowed values if provided
    if (allowedValues && !allowedValues.includes(parsedValue as T)) {
      throw new Error(
        `Environment variable ${key} must be one of: ${allowedValues.join(', ')}`
      );
    }

    // Run custom validator if provided
    if (validator) {
      const validationResult = validator(parsedValue as T);
      if (validationResult !== true) {
        throw new Error(
          validationResult || `Invalid value for environment variable ${key}`
        );
      }
    }

    return parsedValue as T;
  } catch (error) {
    logger.error(`Failed to parse environment variable ${key}:`, error);
    throw error;
  }
}

/**
 * Get a required environment variable
 */
env.required = <T = string>(
  key: string,
  options: Omit<EnvVarOptions<T>, 'required'> = {}
): T => {
  return env(key, { ...options, required: true }) as T;
};

/**
 * Get a boolean environment variable
 */
env.boolean = (key: string, options: Omit<EnvVarOptions<boolean>, 'type'> = {}) => {
  return env<boolean>(key, { ...options, type: 'boolean' });
};

/**
 * Get a number environment variable
 */
env.number = (key: string, options: Omit<EnvVarOptions<number>, 'type'> = {}) => {
  return env<number>(key, { ...options, type: 'number' });
};

/**
 * Get a JSON environment variable
 */
env.json = <T = any>(key: string, options: Omit<EnvVarOptions<T>, 'type'> = {}) => {
  return env<T>(key, { ...options, type: 'json' });
};

/**
 * Get an array environment variable
 */
env.array = <T = string>(
  key: string,
  options: Omit<EnvVarOptions<T[]>, 'type'> = {}
) => {
  return env<T[]>(key, { ...options, type: 'array' });
};

/**
 * Get environment variables with a specific prefix
 */
env.prefix = (prefix: string): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      const cleanKey = key.slice(prefix.length).toLowerCase();
      result[cleanKey] = value;
    }
  }
  
  return result;
};

/**
 * Validate that all required environment variables are set
 */
env.validate = (requiredVars: string[]): void => {
  const missingVars = requiredVars.filter((key) => !(key in process.env));
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

export { env };
