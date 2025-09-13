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

    // APIキー検証をスキップ（テスト用）
    const apiKey = request.headers.get('X-API-Key')
    
    // Supabaseクライアント作成（エラーハンドリング付き）
    let supabase;
    try {
      supabase = createSupabaseServerClient()
    } catch (error) {
      // Service Roleキーがない場合は、Anon Keyを使用
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU'
      supabase = createClient(supabaseUrl, supabaseAnonKey)
    }

    // クエリ構築（companiesテーブルから取得）
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' })

    // 検索条件追加
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,ticker_code.ilike.%${params.search}%`)
    }

    if (params.sector) {
      query = query.eq('sector', params.sector)
    }

    // ページネーション
    const offset = (params.page! - 1) * params.per_page!
    query = query
      .range(offset, offset + params.per_page! - 1)
      .order('name', { ascending: true })

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