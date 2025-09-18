import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let authResult: any = null
  let logParams: any = {}

  try {
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
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_complete_v2', {
        p_api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      console.error('API key verification failed:', keyError || authResult?.error)
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // ログ用パラメータ設定
    logParams = {
      keyId: authResult.key_id,
      userId: authResult.user_id,
      endpoint: '/api/v1/companies',
      method: 'GET',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    }

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
      const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 }
      const reset = rateLimitResult?.reset || { minute: 0, hour: 0, day: 0 }

      // レート制限超過をログ記録
      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 429,
        p_latency_ms: Date.now() - startTime,
        p_error_message: 'Rate limit exceeded'
      })

      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limits: rateLimitResult?.limits,
          current: rateLimitResult?.current,
          remaining,
          reset
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limits.perMin),
            'X-RateLimit-Remaining': String(remaining.minute),
            'X-RateLimit-Reset': String(reset.minute),
            'Retry-After': '60'
          }
        }
      )
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200) // 最大200件
    const cursor = searchParams.get('cursor')
    const fiscalYear = searchParams.get('fiscal_year')
    const nameFilter = searchParams.get('name_filter')

    // ページング対応企業リスト取得
    const { data: paginatedResult, error: companiesError } = await serviceClient
      .rpc('get_companies_list_paginated', {
        p_limit: limit,
        p_cursor: cursor,
        p_fiscal_year: fiscalYear,
        p_name_filter: nameFilter
      })

    if (companiesError) {
      console.error('Failed to fetch companies:', companiesError)

      // エラーログ記録
      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 500,
        p_latency_ms: Date.now() - startTime,
        p_error_message: companiesError.message
      })

      return NextResponse.json(
        { error: 'Failed to fetch companies', details: companiesError.message },
        { status: 500 }
      )
    }

    const latencyMs = Date.now() - startTime
    const responseData = {
      success: true,
      data: paginatedResult?.data || [],
      pagination: paginatedResult?.pagination,
      filters: paginatedResult?.filters,
      tier: authResult.tier,
      performance: {
        latency_ms: latencyMs,
        cached: false
      }
    }

    // 成功ログ記録
    await serviceClient.rpc('log_api_usage', {
      ...logParams,
      p_status_code: 200,
      p_latency_ms: latencyMs,
      p_response_size_bytes: JSON.stringify(responseData).length
    })

    // レート制限ヘッダー付きレスポンス
    const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 }
    const reset = rateLimitResult?.reset || { minute: 0, hour: 0, day: 0 }

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(limits.perMin),
        'X-RateLimit-Remaining': String(remaining.minute),
        'X-RateLimit-Reset': String(reset.minute),
        'Cache-Control': 'private, max-age=0, no-store'
      }
    })

  } catch (error) {
    console.error('Companies API error:', error)

    // エラーログ記録
    if (logParams.keyId) {
      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 500,
        p_latency_ms: Date.now() - startTime,
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let logParams: any = {}

  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    // Create service client
    const serviceClient = supabaseManager.getServiceClient()

    // O(1)化されたAPIキー認証
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_complete_v2', {
        p_api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // ログ用パラメータ設定
    logParams = {
      keyId: authResult.key_id,
      userId: authResult.user_id,
      endpoint: '/api/v1/companies',
      method: 'POST',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    }

    // レート制限チェック
    const tierLimits = {
      free: { perMin: 60, perHour: 1000, perDay: 10000 },
      basic: { perMin: 120, perHour: 3000, perDay: 30000 },
      premium: { perMin: 300, perHour: 10000, perDay: 100000 }
    }
    const limits = tierLimits[authResult.tier as keyof typeof tierLimits] || tierLimits.free

    const { data: rateLimitResult } = await serviceClient
      .rpc('bump_and_check_rate_limit', {
        p_key_id: authResult.key_id,
        p_limit_min: limits.perMin,
        p_limit_hour: limits.perHour,
        p_limit_day: limits.perDay
      })

    if (!rateLimitResult?.ok) {
      const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 }

      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 429,
        p_latency_ms: Date.now() - startTime,
        p_error_message: 'Rate limit exceeded'
      })

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining,
          reset: rateLimitResult?.reset
        },
        { status: 429 }
      )
    }

    // 検索パラメータを取得
    const body = await request.json()
    const { limit = 50, cursor, fiscal_year, file_type, company_name_filter } = body

    // ページング対応データ取得
    const { data: paginatedResult, error: companiesError } = await serviceClient
      .rpc('get_companies_paginated', {
        p_limit: Math.min(limit, 200),
        p_cursor: cursor,
        p_fiscal_year: fiscal_year,
        p_file_type: file_type,
        p_company_name_filter: company_name_filter
      })

    if (companiesError) {
      console.error('Failed to search companies:', companiesError)

      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 500,
        p_latency_ms: Date.now() - startTime,
        p_error_message: companiesError.message
      })

      return NextResponse.json(
        { error: 'Failed to search companies' },
        { status: 500 }
      )
    }

    const latencyMs = Date.now() - startTime
    const responseData = {
      success: true,
      data: paginatedResult?.data || [],
      pagination: paginatedResult?.pagination,
      filters: paginatedResult?.filters,
      tier: authResult.tier,
      performance: {
        latency_ms: latencyMs,
        cached: false
      }
    }

    // 成功ログ記録
    await serviceClient.rpc('log_api_usage', {
      ...logParams,
      p_status_code: 200,
      p_latency_ms: latencyMs,
      p_response_size_bytes: JSON.stringify(responseData).length,
      p_metadata: JSON.stringify({ search_params: body })
    })

    const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 }

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(limits.perMin),
        'X-RateLimit-Remaining': String(remaining.minute),
        'Cache-Control': 'private, max-age=0, no-store'
      }
    })

  } catch (error) {
    console.error('Companies search API error:', error)

    if (logParams.keyId) {
      await serviceClient.rpc('log_api_usage', {
        ...logParams,
        p_status_code: 500,
        p_latency_ms: Date.now() - startTime,
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}