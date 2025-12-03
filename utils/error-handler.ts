import { NextResponse } from 'next/server';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import { ZodError } from 'zod';

/**
 * API エラーハンドリング統一関数
 * すべてのAPIエンドポイントで一貫したエラー処理を提供
 */

export function handleApiError(error: unknown, context?: string): NextResponse {
  // コンテキスト情報をログに記録
  if (context && process.env.NODE_ENV === 'development') {
    console.error(`[Error in ${context}]`, error);
  }

  // Zod バリデーションエラー
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    return createApiResponse.validationError(fieldErrors);
  }

  // レート制限エラー（Response オブジェクト）
  if (error instanceof Response) {
    return NextResponse.json(
      await error.json().catch(() => ({ error: 'Rate limit exceeded' })),
      { status: error.status, headers: error.headers }
    );
  }

  // 一般的なエラー
  return createApiResponse.internalError(
    error,
    'An unexpected error occurred'
  );
}

/**
 * async 関数をラップしてエラーハンドリングを自動化
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  }) as T;
}
