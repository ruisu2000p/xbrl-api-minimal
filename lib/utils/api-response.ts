import { NextResponse } from 'next/server'
import { logger } from './logger'

interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  count?: number
  metadata?: Record<string, any>
}

interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
}

type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    count?: number
    metadata?: Record<string, any>
    status?: number
  }
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.count !== undefined && { count: options.count }),
      ...(options?.metadata && { metadata: options.metadata })
    },
    { status: options?.status || 200 }
  )
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  options?: {
    code?: string
    details?: any
    status?: number
  }
): NextResponse<ApiErrorResponse> {
  const error = {
    success: false as const,
    error: message,
    ...(options?.code && { code: options.code }),
    ...(options?.details && { details: options.details })
  }

  // Log error in development
  logger.error('API Error:', error)

  return NextResponse.json(error, {
    status: options?.status || 400
  })
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): NextResponse<ApiErrorResponse> {
  logger.error('Unhandled API error:', error)

  if (error?.message?.includes('unauthorized')) {
    return errorResponse('Unauthorized', {
      code: 'UNAUTHORIZED',
      status: 401
    })
  }

  if (error?.message?.includes('not found')) {
    return errorResponse('Resource not found', {
      code: 'NOT_FOUND',
      status: 404
    })
  }

  return errorResponse('Internal server error', {
    code: 'INTERNAL_ERROR',
    status: 500,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
}