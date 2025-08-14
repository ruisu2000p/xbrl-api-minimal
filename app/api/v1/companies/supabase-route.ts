import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// APIキーの検証
async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey || !apiKey.startsWith('xbrl_')) {
    return false;
  }
  
  // Supabaseでキーを確認
  const keyHash = Buffer.from(apiKey).toString('base64');
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, is_active, expires_at, usage_count, monthly_limit')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  // 有効期限とアクティブステータスをチェック
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (!data.is_active || expiresAt < now) {
    return false;
  }
  
  // 月間制限チェック
  if (data.usage_count >= data.monthly_limit) {
    return false;
  }
  
  // 使用カウントを増やす
  await supabase
    .from('api_keys')
    .update({ 
      usage_count: data.usage_count + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', data.id);
  
  // 使用ログを記録
  await supabase.from('api_usage_logs').insert({
    api_key_id: data.id,
    endpoint: '/api/v1/companies',
    method: 'GET',
    status_code: 200,
    created_at: new Date().toISOString()
  });
  
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    // 開発環境では認証をスキップ（本番では削除）
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !await validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid, expired, or rate-limited API key' },
        { status: 401 }
      );
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20'), 100); // 最大100件
    const sector = searchParams.get('sector');
    const market = searchParams.get('market');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'name'; // name, ticker, sector
    const order = searchParams.get('order') || 'asc'; // asc, desc

    // Supabaseクエリ構築
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    // フィルタリング
    if (sector) {
      query = query.eq('sector', sector);
    }
    
    if (market) {
      query = query.eq('market', market);
    }
    
    if (search) {
      // 企業名またはティッカーコードで検索
      query = query.or(`name.ilike.%${search}%,ticker.ilike.%${search}%`);
    }

    // ソート
    const sortColumn = ['name', 'ticker', 'sector', 'market'].includes(sortBy) 
      ? sortBy 
      : 'name';
    query = query.order(sortColumn, { ascending: order === 'asc' });

    // ページネーション
    const startIndex = (page - 1) * perPage;
    query = query.range(startIndex, startIndex + perPage - 1);

    // クエリ実行
    const { data: companies, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    // 集計情報を取得（セクター別の企業数）
    const { data: sectorStats } = await supabase
      .from('companies')
      .select('sector')
      .not('sector', 'is', null);
    
    const sectorCounts: Record<string, number> = {};
    if (sectorStats) {
      sectorStats.forEach(item => {
        if (item.sector) {
          sectorCounts[item.sector] = (sectorCounts[item.sector] || 0) + 1;
        }
      });
    }

    // レスポンスデータ構築
    const responseData = {
      companies: companies || [],
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage),
        has_next: page < Math.ceil((count || 0) / perPage),
        has_prev: page > 1
      },
      filters: {
        available_sectors: Object.keys(sectorCounts).sort(),
        sector_counts: sectorCounts,
        applied_filters: {
          sector,
          market,
          search
        }
      },
      metadata: {
        sort_by: sortColumn,
        order,
        api_version: 'v1',
        data_source: 'supabase'
      }
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-Total-Count': String(count || 0),
        'X-Page': String(page),
        'X-Per-Page': String(perPage)
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : undefined
      },
      { status: 500 }
    );
  }
}