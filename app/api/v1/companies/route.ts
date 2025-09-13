// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { Company, ApiResponse, PaginationParams } from '@/lib/types';
import crypto from 'crypto';

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

    // シンプルなAPIキー検証
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'API key required', status: 401 },
        { status: 401 }
      )
    }

    // Supabaseクライアント作成
    const supabase = createSupabaseServerClient()
    
    // APIキー検証（シンプル版）
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const { data: validKey } = await supabase
      .from('api_keys')
      .select('id, status')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single()
    
    if (!validKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid API key', status: 401 },
        { status: 401 }
      )
    }

    // APIキーの最終使用日時を更新
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', validKey.id)

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
        { success: false, error: 'Failed to fetch companies', status: 500 },
        { status: 500 }
      )
    }

    // レスポンス作成
    const response = {
      data: data as Company[],
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
      { success: false, error: 'Internal server error', status: 500 },
      { status: 500 }
    )
  }
}