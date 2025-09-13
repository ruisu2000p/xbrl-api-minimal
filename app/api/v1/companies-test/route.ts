// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { Company, ApiResponse, PaginationParams } from '@/lib/types';

// GET /api/v1/companies-test - 企業一覧取得（APIキー検証なし版）
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

    // Supabaseクライアント作成
    const supabase = createSupabaseServerClient()
    
    // クエリ構築（companiesテーブルから取得）
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' })

    // 検索条件追加
    if (params.search) {
      query = query.or(`company_name.ilike.%${params.search}%,ticker_code.ilike.%${params.search}%`)
    }

    if (params.sector) {
      query = query.eq('sector', params.sector)
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
      // エラー詳細を含める
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          status: 500 
        },
        { status: 500 }
      )
    }

    // レスポンス作成
    const response = {
      success: true,
      data: data || [],
      pagination: {
        page: params.page,
        per_page: params.per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / params.per_page!)
      },
      status: 200
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500 
      },
      { status: 500 }
    )
  }
}