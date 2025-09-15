import { NextResponse } from 'next/server';
import { logger } from '../utils/logger';
import { configManager } from './config-manager';

/**
 * Error types and codes
 */
export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
}

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error response builder
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Global error handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error and return appropriate response
   */
  handleError(error: unknown, requestId?: string): NextResponse<ErrorResponse> {
    // Parse error
    const parsedError = this.parseError(error);

    // Log error
    this.logError(parsedError, requestId);

    // Build response
    const response = this.buildErrorResponse(parsedError, requestId);

    // Return Next.js response
    return NextResponse.json(response, {
      status: parsedError.statusCode,
      headers: {
        'X-Request-Id': requestId || '',
        'X-Error-Code': parsedError.code,
      },
    });
  }

  /**
   * Parse various error types
   */
  private parseError(error: unknown): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Supabase error
    if (this.isSupabaseError(error)) {
      return this.parseSupabaseError(error);
    }

    // Standard Error
    if (error instanceof Error) {
      return new AppError(
        ErrorCode.INTERNAL_ERROR,
        this.sanitizeErrorMessage(error.message),
        500,
        configManager.isDevelopment() ? error.stack : undefined
      );
    }

    // Unknown error
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    );
  }

  /**
   * Check if error is from Supabase
   */
  private isSupabaseError(error: any): boolean {
    return error?.code && error?.message && error?.details;
  }

  /**
   * Parse Supabase error
   */
  private parseSupabaseError(error: any): AppError {
    const codeMap: Record<string, ErrorCode> = {
      '42P01': ErrorCode.DATABASE_ERROR,
      '23505': ErrorCode.VALIDATION_ERROR,
      'PGRST116': ErrorCode.NOT_FOUND,
      'PGRST301': ErrorCode.UNAUTHORIZED,
      'storage/object-not-found': ErrorCode.RESOURCE_NOT_FOUND,
      'storage/unauthorized': ErrorCode.UNAUTHORIZED,
    };

    const errorCode = codeMap[error.code] || ErrorCode.DATABASE_ERROR;
    const statusCode = this.getStatusCodeForError(errorCode);

    return new AppError(
      errorCode,
      error.message,
      statusCode,
      configManager.isDevelopment() ? error.details : undefined
    );
  }

  /**
   * Get HTTP status code for error code
   */
  private getStatusCodeForError(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      [ErrorCode.UNAUTHORIZED]: 401,
      [ErrorCode.INVALID_API_KEY]: 401,
      [ErrorCode.EXPIRED_TOKEN]: 401,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INVALID_REQUEST]: 400,
      [ErrorCode.MISSING_PARAMETER]: 400,
      [ErrorCode.NOT_FOUND]: 404,
      [ErrorCode.RESOURCE_NOT_FOUND]: 404,
      [ErrorCode.INTERNAL_ERROR]: 500,
      [ErrorCode.DATABASE_ERROR]: 500,
      [ErrorCode.STORAGE_ERROR]: 500,
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
      [ErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ErrorCode.MAINTENANCE_MODE]: 503,
    };

    return statusMap[code] || 500;
  }

  /**
   * Sanitize error message for production
   */
  private sanitizeErrorMessage(message: string): string {
    if (configManager.isDevelopment()) {
      return message;
    }

    // Remove sensitive information
    const sensitivePatterns = [
      /api[_-]?key/gi,
      /password/gi,
      /token/gi,
      /secret/gi,
      /database/gi,
      /supabase/gi,
    ];

    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError, requestId?: string): void {
    const logData = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId,
      details: error.details,
      stack: error.stack,
    };

    if (error.statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.info('Error handled', logData);
    }
  }

  /**
   * Build error response
   */
  private buildErrorResponse(error: AppError, requestId?: string): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    };

    if (requestId) {
      response.error.requestId = requestId;
    }

    if (configManager.isDevelopment() && error.details) {
      response.error.details = error.details;
    }

    return response;
  }

  /**
   * Create common errors
   */
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }

  static validationError(message: string, details?: any): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  static rateLimitExceeded(retryAfter?: number): AppError {
    return new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      429,
      { retryAfter }
    );
  }

  static databaseError(message = 'Database operation failed'): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, 500);
  }

  static internalError(message = 'Internal server error'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export helper functions
export const handleError = (error: unknown, requestId?: string) =>
  errorHandler.handleError(error, requestId);

// Async error wrapper for route handlers
export function asyncHandler<T = any>(
  handler: (req: Request) => Promise<T>
) {
  return async (req: Request): Promise<T | NextResponse<ErrorResponse>> => {
    try {
      return await handler(req);
    } catch (error) {
      const requestId = req.headers.get('x-request-id') || undefined;
      return errorHandler.handleError(error, requestId);
    }
  };
}