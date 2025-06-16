import NightwatchError from './base-error';
import type { NightwatchErrorOptions } from './types';

/**
 * Base HTTP error class for all HTTP error responses
 */
class HttpError extends NightwatchError {
  constructor(
    message: string,
    statusCode: number,
    options: Omit<NightwatchErrorOptions, 'statusCode' | 'code'> & { code: string } = { code: `HTTP_${statusCode}` }
  ) {
    super(message, {
      ...options,
      statusCode,
      isOperational: true,
    });
  }
}

// 4xx Client Errors

/** 400 Bad Request */
export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, 400, {
      code: 'HTTP_BAD_REQUEST',
      ...options,
    });
  }
}

/** 401 Unauthorized */
export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, 401, {
      code: 'HTTP_UNAUTHORIZED',
      ...options,
    });
  }
}

/** 403 Forbidden */
export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, 403, {
      code: 'HTTP_FORBIDDEN',
      ...options,
    });
  }
}

/** 404 Not Found */
export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, 404, {
      code: 'HTTP_NOT_FOUND',
      ...options,
    });
  }
}

/** 405 Method Not Allowed */
export class MethodNotAllowedError extends HttpError {
  constructor(
    message = 'Method Not Allowed',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 405, {
      code: 'HTTP_METHOD_NOT_ALLOWED',
      ...options,
    });
  }
}

/** 409 Conflict */
export class ConflictError extends HttpError {
  constructor(message = 'Conflict', options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, 409, {
      code: 'HTTP_CONFLICT',
      ...options,
    });
  }
}

/** 422 Unprocessable Entity */
export class UnprocessableEntityError extends HttpError {
  constructor(
    message = 'Unprocessable Entity',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 422, {
      code: 'HTTP_UNPROCESSABLE_ENTITY',
      ...options,
    });
  }
}

/** 429 Too Many Requests */
export class TooManyRequestsError extends HttpError {
  constructor(
    message = 'Too Many Requests',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 429, {
      code: 'HTTP_TOO_MANY_REQUESTS',
      ...options,
    });
  }
}

// 5xx Server Errors

/** 500 Internal Server Error */
export class InternalServerError extends HttpError {
  constructor(
    message = 'Internal Server Error',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 500, {
      code: 'HTTP_INTERNAL_SERVER_ERROR',
      ...options,
    });
  }
}

/** 501 Not Implemented */
export class NotImplementedError extends HttpError {
  constructor(
    message = 'Not Implemented',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 501, {
      code: 'HTTP_NOT_IMPLEMENTED',
      ...options,
    });
  }
}

/** 503 Service Unavailable */
export class ServiceUnavailableError extends HttpError {
  constructor(
    message = 'Service Unavailable',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 503, {
      code: 'HTTP_SERVICE_UNAVAILABLE',
      ...options,
    });
  }
}

/** 504 Gateway Timeout */
export class GatewayTimeoutError extends HttpError {
  constructor(
    message = 'Gateway Timeout',
    options: Omit<NightwatchErrorOptions, 'code'> = {}
  ) {
    super(message, 504, {
      code: 'HTTP_GATEWAY_TIMEOUT',
      ...options,
    });
  }
}

// All HTTP error classes are already exported individually above
