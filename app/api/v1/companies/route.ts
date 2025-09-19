import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { SecureInputValidator, ValidationError } from '@/lib/security/input-validator'
import { SecurityMiddleware } from '@/lib/middleware/security-middleware'
import { withSecurity } from '@/lib/middleware/security-middleware'

// このルートは動的である必要があります（request.headersを使用）
export const dynamic = 'force-dynamic'

async function handleGetRequest(request: NextRequest) {
  const startTime = Date.now()
  let authResult: any = null
  let logParams: any = {}

  try {
    // 🛡️ セキュリティ検証を最優先実行
    const securityCheck = await SecurityMiddleware.validateRequest(request, '/api/v1/companies')

    if (!securityCheck.valid) {
      return NextResponse.json({
        error: securityCheck.error,
        code: securityCheck.code,
        violations: securityCheck.violations,
        requestId: securityCheck.requestId
      }, {
        status: securityCheck.statusCode || 400,
        headers: {
          'X-Security-Violation': securityCheck.violations?.join(',') || 'UNKNOWN',
          'X-Request-ID': securityCheck.requestId
        }
      })
    }

    // Get API key from header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    // Create service client for API key validation
    const serviceClient = supabaseManager.getServiceClient()

    // O(1)化されたAPIキー認証（public_id埋め込み方式）
    const { data: authData, error: keyError } = await serviceClient
      .rpc('verify_api_key_complete_v2', {
        p_api_key: apiKey
      })

    if (keyError || !authData?.valid) {
      console.error('API key verification failed:', keyError || authData?.error)
      return NextResponse.json(
        { error: authData?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    authResult = authData

    // ログ用パラメータ設定
    logParams = {
      keyId: authResult.key_id,
      userId: authResult.user_id,
      endpoint: '/api/v1/companies',
      method: 'GET',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      securityRequestId: securityCheck.requestId
    }

    // 🛡️ 安全な入力パラメータ取得と検証
    const searchParams = request.nextUrl.searchParams

    // セキュア入力検証
    const limit = SecureInputValidator.validateNumeric(
      searchParams.get('limit'),
      1,
      200,
      50
    )

    const fiscalYear = SecureInputValidator.validateFiscalYear(
      searchParams.get('fiscal_year')
    )

    const nameFilter = SecureInputValidator.validateSearchQuery(
      searchParams.get('name_filter')
    )

    const cursor = SecureInputValidator.validateCursor(
      searchParams.get('cursor')
    )

    // レート制限チェック（tier別制限）
    const tierLimits = {
      free: { perMin: 60, perHour: 1000, perDay: 10000 },
      basic: { perMin: 120, perHour: 3000, perDay: 30000 },
      premium: { perMin: 300, perHour: 10000, perDay: 100000 }
    }
    const limits = tierLimits[authResult.tier as keyof typeof tierLimits] || tierLimits.free

    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('bump_and_check_rate_limit', {
        p_key_id: authResult.key_id,
        p_limit_min: limits.perMin,
        p_limit_hour: limits.perHour,
        p_limit_day: limits.perDay
      })

    if (rateLimitError || !rateLimitResult?.ok) {
      // データアクセス前にレート制限
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult?.retry_after || 60,
          limits: {
            per_minute: limits.perMin,
            per_hour: limits.perHour,
            per_day: limits.perDay
          },
          usage: {
            current_minute: rateLimitResult?.current_minute || 0,
            current_hour: rateLimitResult?.current_hour || 0,
            current_day: rateLimitResult?.current_day || 0
          }
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult?.retry_after || 60),
            'X-RateLimit-Limit': String(limits.perMin),
            'X-RateLimit-Remaining': String(Math.max(0, limits.perMin - (rateLimitResult?.current_minute || 0))),
            'X-RateLimit-Reset': String(Date.now() + 60000)
          }
        }
      )
    }

    // 🛡️ セキュアなデータベースクエリ実行
    const { data: paginatedResult, error: companiesError } = await serviceClient
      .rpc('get_companies_list_paginated_secure', {
        p_limit: limit,
        p_cursor: cursor,
        p_fiscal_year: fiscalYear,
        p_name_filter: nameFilter,
        p_request_id: securityCheck.requestId
      })

    if (companiesError) {
      console.error('Companies fetch failed:', companiesError)

      // 使用ログ記録（エラー）
      await serviceClient.from('api_key_usage_logs').insert({
        ...logParams,
        status: 'error',
        responseTime: Date.now() - startTime,
        requestParams: { limit, cursor, fiscal_year: fiscalYear, name_filter: nameFilter },
        errorMessage: companiesError.message
      })

      return NextResponse.json(
        {
          error: 'Failed to fetch companies',
          message: process.env.NODE_ENV === 'production' ? 'Data retrieval failed' : companiesError.message,
          requestId: securityCheck.requestId
        },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime

    // 使用ログ記録（成功）
    await serviceClient.from('api_key_usage_logs').insert({
      ...logParams,
      status: 'success',
      responseTime,
      requestParams: { limit, cursor, fiscal_year: fiscalYear, name_filter: nameFilter },
      responseDataCount: paginatedResult?.data?.length || 0
    })

    // Prepare response data with filtering based on tier
    let responseData: any = {
      success: true,
      data: paginatedResult?.data || [],
      pagination: paginatedResult?.pagination,
      security: {
        validated: true,
        violations: securityCheck.violations,
        processingTime: securityCheck.processingTime
      },
      performance: {
        latency_ms: responseTime,
        cached: false
      }
    }

    // Apply tier-specific filtering for free tier
    if (authResult.tier === 'free' && responseData.data.length > 0) {
      responseData.data = responseData.data.map((company: any) => ({
        ...company,
        // Free tierでは一部のフィールドを制限
        detailed_info: undefined,
        internal_data: undefined
      }))
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Security-Status': 'VALIDATED',
        'X-Security-Processing-Time': String(securityCheck.processingTime),
        'X-Request-ID': securityCheck.requestId,
        'Cache-Control': 'private, max-age=0, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-RateLimit-Limit': String(limits.perMin),
        'X-RateLimit-Remaining': String(Math.max(0, limits.perMin - (rateLimitResult?.current_minute || 0)))
      }
    })

  } catch (error) {
    console.error('API error:', error)

    // エラーログ記録
    if (authResult?.key_id) {
      const serviceClient = supabaseManager.getServiceClient()
      await serviceClient.from('api_key_usage_logs').insert({
        ...logParams,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // ValidationError の場合は適切なステータスコードを返す
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          requestId: crypto.randomUUID()
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : (error as Error).message,
        requestId: crypto.randomUUID()
      },
      { status: 500 }
    )
  }
}

async function handlePostRequest(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 🛡️ セキュリティ検証
    const securityCheck = await SecurityMiddleware.validateRequest(request, '/api/v1/companies')

    if (!securityCheck.valid) {
      return NextResponse.json({
        error: securityCheck.error,
        code: securityCheck.code,
        violations: securityCheck.violations,
        requestId: securityCheck.requestId
      }, {
        status: securityCheck.statusCode || 400
      })
    }

    // API key validation
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 401 })
    }

    const serviceClient = supabaseManager.getServiceClient()
    const { data: authResult, error: authError } = await serviceClient
      .rpc('verify_api_key_complete_v2', { p_api_key: apiKey })

    if (authError || !authResult?.valid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // 🛡️ リクエストボディの安全な取得と検証
    const body = await request.json()
    const validatedParams = SecureInputValidator.validateBatchParameters(body)

    // Secure RPC call with validated parameters
    const { data: paginatedResult, error: companiesError } = await serviceClient
      .rpc('get_companies_paginated_secure', {
        p_limit: validatedParams.limit || 50,
        p_cursor: validatedParams.cursor,
        p_fiscal_year: validatedParams.fiscal_year,
        p_file_type: validatedParams.file_type,
        p_company_name_filter: validatedParams.name_filter,
        p_request_id: securityCheck.requestId
      })

    if (companiesError) {
      console.error('POST companies fetch failed:', companiesError)
      return NextResponse.json(
        {
          error: 'Failed to fetch companies',
          requestId: securityCheck.requestId
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: paginatedResult?.data || [],
      pagination: paginatedResult?.pagination,
      security: {
        validated: true,
        requestId: securityCheck.requestId
      },
      performance: {
        latency_ms: Date.now() - startTime
      }
    }, {
      status: 200,
      headers: {
        'X-Security-Status': 'VALIDATED',
        'X-Request-ID': securityCheck.requestId
      }
    })

  } catch (error) {
    console.error('POST API error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// エクスポート（withSecurityミドルウェアでラップ）
export const GET = withSecurity(handleGetRequest)
export const POST = withSecurity(handlePostRequest)