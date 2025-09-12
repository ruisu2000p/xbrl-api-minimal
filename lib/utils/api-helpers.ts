import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ApiError } from '@/lib/types';

/**
 * 標準的なAPIレスポンスを作成
 */
export function createApiResponse<T>(
  data?: T,
  status: number = 200,
  message?: string
): NextResponse {
  const response: ApiResponse<T> = {
    success: status >= 200 && status < 300,
    data,
    message,
  };

  return NextResponse.json(response, { status });
}

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse {
  const error: ApiError = {
    code: code || 'ERROR',
    message,
    details,
    status,
  };

  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    },
    { status }
  );
}

/**
 * リクエストからAPIキーを取得
 */
export function getApiKey(request: NextRequest): string | null {
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey;
}

/**
 * ページネーションパラメータを取得
 */
export function getPaginationParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20')));
  
  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  };
}

/**
 * CORS headers
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight
 */
export function handleCors() {
  return new NextResponse(null, { 
    status: 200, 
    headers: corsHeaders 
  });
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(identifier: string, window: 'minute' | 'hour' | 'day'): string {
  const now = new Date();
  let key = `rate_limit:${identifier}:`;
  
  switch (window) {
    case 'minute':
      key += `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      break;
    case 'hour':
      key += `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      break;
    case 'day':
      key += `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      break;
  }
  
  return key;
}