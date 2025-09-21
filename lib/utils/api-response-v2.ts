import { NextResponse } from 'next/server';

/**
 * 統一APIレスポンス型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiMetadata {
  timestamp: string;
  requestId?: string;
  version?: string;
}

/**
 * エラーコード定義
 */
export const ErrorCodes = {
  // 認証関連
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // バリデーション
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // リソース
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // レート制限
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // サーバーエラー
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * HTTPステータスコードマッピング
 */
const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
};

/**
 * APIレスポンスビルダー
 */
export class ApiResponseBuilder {
  /**
   * 成功レスポンスを作成
   */
  static success<T>(data: T, metadata?: Partial<ApiMetadata>): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    return NextResponse.json(response, { status: 200 });
  }

  /**
   * エラーレスポンスを作成
   */
  static error(
    code: ErrorCode,
    message: string,
    details?: any,
    statusOverride?: number
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    const status = statusOverride || ErrorStatusMap[code] || 500;

    return NextResponse.json(response, { status });
  }

  /**
   * カスタムエラーレスポンスを作成
   */
  static customError(
    error: ApiError,
    status: number = 500
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error,
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status });
  }

  /**
   * バリデーションエラーレスポンスを作成
   */
  static validationError(
    errors: Record<string, string[]>
  ): NextResponse<ApiResponse> {
    return ApiResponseBuilder.error(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      errors
    );
  }

  /**
   * 認証エラーレスポンスを作成
   */
  static unauthorized(
    message: string = 'Authentication required'
  ): NextResponse<ApiResponse> {
    return ApiResponseBuilder.error(
      ErrorCodes.UNAUTHORIZED,
      message
    );
  }

  /**
   * 権限エラーレスポンスを作成
   */
  static forbidden(
    message: string = 'Access denied'
  ): NextResponse<ApiResponse> {
    return ApiResponseBuilder.error(
      ErrorCodes.FORBIDDEN,
      message
    );
  }

  /**
   * Not Foundエラーレスポンスを作成
   */
  static notFound(
    resource: string
  ): NextResponse<ApiResponse> {
    return ApiResponseBuilder.error(
      ErrorCodes.NOT_FOUND,
      `${resource} not found`
    );
  }

  /**
   * レート制限エラーレスポンスを作成
   */
  static rateLimitExceeded(
    retryAfter?: number
  ): NextResponse<ApiResponse> {
    const response = ApiResponseBuilder.error(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { retryAfter }
    );

    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString());
    }

    return response;
  }

  /**
   * 内部エラーレスポンスを作成（本番環境では詳細を隠す）
   */
  static internalError(
    error: unknown,
    message: string = 'Internal server error'
  ): NextResponse<ApiResponse> {
    // 開発環境では詳細なエラー情報を含める
    const details = process.env.NODE_ENV === 'development'
      ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      : undefined;

    return ApiResponseBuilder.error(
      ErrorCodes.INTERNAL_ERROR,
      message,
      details
    );
  }
}

// エクスポート用のエイリアス
export const createApiResponse = ApiResponseBuilder;