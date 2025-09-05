// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/client';
import { validateApiKey } from '@/lib/utils/validateApiKey';

// Supabase クライアントの初期化
const supabase = createSupabaseClient();



export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // クエリパラメータ取得（MCPサーバー互換性対応）
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = searchParams.get('limit'); // MCPサーバーからのlimitパラメータ
    const perPage = parseInt(searchParams.get('per_page') || limit || '100');
    const sector = searchParams.get('sector') || searchParams.get('industry'); // MCPサーバーは'industry'を送る
    const search = searchParams.get('search') || searchParams.get('query'); // MCPサーバーは'query'を送る

    // Supabaseから企業データを取得
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    // フィルタリング
    if (sector) {
      query = query.eq('sector', sector);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,ticker.ilike.%${search}%`);
    }

    // ページネーション
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    // データ取得
    const { data: companies, error, count } = await query;

    if (error) {
      return NextResponse.json({
        error: 'Database connection failed',
        message: error.message
      }, {
        status: 503
      });
    }

    return NextResponse.json({
      companies: companies || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      source: 'database'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}