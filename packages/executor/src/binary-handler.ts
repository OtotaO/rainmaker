/**
 * Binary data handling utilities for HTTP responses.
 * 
 * This module provides robust handling of various binary data formats
 * that may be returned by HTTP APIs. It ensures that any data type
 * can be safely converted to a base64-encoded string for storage.
 * 
 * Supported input types:
 * - Buffer (Node.js native)
 * - ArrayBuffer (Web platform)
 * - Typed arrays (Uint8Array, etc.)
 * - Base64 strings
 * - Binary strings
 * - Objects (JSON stringified)
 * - Unknown types (converted to string)
 * 
 * Design decisions:
 * - Always output base64 for consistency
 * - Detect and decode existing base64 to prevent double-encoding
 * - Limit size to prevent memory exhaustion
 * - Graceful fallback for conversion errors
 */

export interface BinaryConversionResult {
  buffer: Buffer;
  base64: string;
  size: number;
  error?: string;
}

/**
 * Maximum allowed binary response size (100MB).
 * This prevents memory exhaustion from malicious or misconfigured APIs.
 */
export const MAX_BINARY_SIZE = 100 * 1024 * 1024;

/**
 * Convert various response data types to a Buffer.
 * 
 * This function handles all possible data types that might be returned
 * by HTTP libraries or APIs, ensuring robust binary data handling.
 * 
 * @param data The response data in any format
 * @returns Conversion result with buffer and metadata
 */
export function convertToBinary(data: unknown): BinaryConversionResult {
  let buffer: Buffer;
  let error: string | undefined;
  
  try {
    if (Buffer.isBuffer(data)) {
      // Already a Buffer, use directly
      buffer = data;
    } else if (data instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Buffer
      buffer = Buffer.from(data);
    } else if (
      data instanceof Uint8Array || 
      data instanceof Int8Array ||
      data instanceof Uint8ClampedArray ||
      data instanceof Uint16Array ||
      data instanceof Int16Array ||
      data instanceof Uint32Array ||
      data instanceof Int32Array ||
      data instanceof Float32Array ||
      data instanceof Float64Array
    ) {
      // Convert typed array to Buffer
      buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    } else if (typeof data === 'string') {
      // String data - could be base64 or binary string
      buffer = handleStringData(data);
    } else if (typeof data === 'object' && data !== null) {
      // Object data - stringify and convert
      try {
        const jsonStr = JSON.stringify(data);
        buffer = Buffer.from(jsonStr, 'utf8');
      } catch (stringifyError) {
        // If stringify fails, use toString
        buffer = Buffer.from(String(data), 'utf8');
        error = `JSON stringify failed: ${stringifyError instanceof Error ? stringifyError.message : 'Unknown error'}`;
      }
    } else if (data === null || data === undefined) {
      // Null/undefined - create empty buffer
      buffer = Buffer.alloc(0);
    } else {
      // Unknown type - convert to string first
      buffer = Buffer.from(String(data), 'utf8');
    }
  } catch (conversionError) {
    // If all conversion attempts fail, create error buffer
    const errorMsg = `Failed to convert response to buffer: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`;
    buffer = Buffer.from(errorMsg, 'utf8');
    error = errorMsg;
  }
  
  // Check size limit
  if (buffer.length > MAX_BINARY_SIZE) {
    throw new Error(
      `Binary response too large: ${buffer.length} bytes exceeds maximum of ${MAX_BINARY_SIZE} bytes`
    );
  }
  
  return {
    buffer,
    base64: buffer.toString('base64'),
    size: buffer.length,
    error,
  };
}

/**
 * Handle string data that might be base64 or binary.
 * 
 * This function attempts to detect if a string is already base64 encoded
 * to prevent double-encoding. If it's not base64, it treats it as a
 * binary string.
 * 
 * @param data String data to convert
 * @returns Buffer representation of the string
 */
function handleStringData(data: string): Buffer {
  // Remove whitespace for base64 detection
  const trimmed = data.replace(/\s/g, '');
  
  // Base64 regex - must be properly padded
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  
  // Additional validation for base64
  const isLikelyBase64 = 
    trimmed.length > 0 &&
    trimmed.length % 4 === 0 &&
    base64Regex.test(trimmed);
  
  if (isLikelyBase64) {
    try {
      // Try to decode as base64
      const decoded = Buffer.from(trimmed, 'base64');
      
      // Verify the decode worked by re-encoding and comparing
      const reencoded = decoded.toString('base64');
      if (reencoded === trimmed) {
        return decoded;
      }
    } catch {
      // Not valid base64, fall through to binary string
    }
  }
  
  // Treat as binary string
  return Buffer.from(data, 'binary');
}

/**
 * Create a binary response output object.
 * 
 * This creates the standardized output format for binary responses
 * that will be stored and returned to the user.
 * 
 * @param buffer The binary data buffer
 * @param contentType The HTTP content type
 * @returns Formatted output object
 */
export function createBinaryOutput(buffer: Buffer, contentType: string) {
  return {
    binary: buffer.toString('base64'),
    contentType,
    size: buffer.length,
  };
}