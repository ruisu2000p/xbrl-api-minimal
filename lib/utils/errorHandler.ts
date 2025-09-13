import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json<ApiResponse<null>>(
      {
        error: error.message,
        status: error.statusCode,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Supabaseエラーの処理
    if ('status' in error && typeof error.status === 'number') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error.message,
          status: error.status
        },
        { status: error.status }
      );
    }

    // 一般的なエラー
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error.message || 'Internal server error',
        status: 500
      },
      { status: 500 }
    );
  }

  // 不明なエラー
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: 'An unexpected error occurred',
      status: 500
    },
    { status: 500 }
  );
}

// 非同期エラーハンドラーラッパー
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}