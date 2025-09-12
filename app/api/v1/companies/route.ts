import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { Company, ApiResponse, PaginationParams } from '@/lib/types';

// GET /api/v1/companies - 企業一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // パラメータ取得
    const params: PaginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      per_page: parseInt(searchParams.get('per_page') || '20'),
      search: searchParams.get('search') || undefined,
      sector: searchParams.get('sector') || undefined,
      fiscal_year: searchParams.get('fiscal_year') || '2024'
    }

    // APIキー検証（改善版）
    const apiKey = request.headers.get('X-API-Key')
    
    // authMiddlewareを使用した検証
    const { validateApiKeyWithDB, addRateLimitHeaders } = await import('@/lib/middleware/authMiddleware')
    const validation = await validateApiKeyWithDB(apiKey || '', request)
    
    if (!validation.valid) {
      const errorResponse = NextResponse.json<ApiResponse<null>>(
        { 
          error: validation.error || 'Invalid API key', 
          status: validation.error?.includes('rate limit') ? 429 : 401 
        },
        { status: validation.error?.includes('rate limit') ? 429 : 401 }
      )
      
      return addRateLimitHeaders(errorResponse, validation)
    }

    // Supabaseクライアント作成
    const supabase = createSupabaseServerClient()

    // クエリ構築
    let query = supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact' })

    // 検索条件追加
    if (params.search) {
      query = query.or(`company_name.ilike.%${params.search}%,ticker_code.ilike.%${params.search}%`)
    }

    if (params.sector) {
      query = query.eq('sector', params.sector)
    }

    if (params.fiscal_year) {
      query = query.eq('fiscal_year', params.fiscal_year)
    }

    // ページネーション
    const offset = (params.page! - 1) * params.per_page!
    query = query
      .range(offset, offset + params.per_page! - 1)
      .order('company_name', { ascending: true })

    // データ取得
    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch companies', status: 500 },
        { status: 500 }
      )
    }

    // 成功レスポンス作成
    const successResponse = NextResponse.json({
      data: data as Company[],
      pagination: {
        page: params.page,
        per_page: params.per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / params.per_page!)
      },
      status: 200
    })

    // レート制限ヘッダー追加
    return addRateLimitHeaders(successResponse, validation)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error', status: 500 },
      { status: 500 }
    )
  }
}