import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// サンプル企業データ（フォールバック用）
const sampleCompanies = [
  { id: '7203', name: 'トヨタ自動車株式会社', ticker: '7203', sector: '輸送用機器', market: '東証プライム' },
  { id: '6758', name: 'ソニーグループ株式会社', ticker: '6758', sector: '電気機器', market: '東証プライム' },
  { id: '6861', name: '株式会社キーエンス', ticker: '6861', sector: '電気機器', market: '東証プライム' },
  { id: '9984', name: 'ソフトバンクグループ株式会社', ticker: '9984', sector: '情報・通信業', market: '東証プライム' },
  { id: '6098', name: '株式会社リクルートホールディングス', ticker: '6098', sector: 'サービス業', market: '東証プライム' },
  { id: '6501', name: '株式会社日立製作所', ticker: '6501', sector: '電気機器', market: '東証プライム' },
  { id: '8306', name: '株式会社三菱UFJフィナンシャル・グループ', ticker: '8306', sector: '銀行業', market: '東証プライム' },
  { id: '9432', name: '日本電信電話株式会社', ticker: '9432', sector: '情報・通信業', market: '東証プライム' },
  { id: '4519', name: '中外製薬株式会社', ticker: '4519', sector: '医薬品', market: '東証プライム' },
  { id: '9433', name: 'KDDI株式会社', ticker: '9433', sector: '情報・通信業', market: '東証プライム' }
];

// APIキーの検証（簡易版）
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  // 実際の実装では、データベースでAPIキーを確認
  return apiKey.startsWith('xbrl_');
}

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

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '100');
    const sector = searchParams.get('sector');
    const search = searchParams.get('search');

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
      console.error('Database error:', error);
      // フォールバック: サンプルデータを使用
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedCompanies = sampleCompanies.slice(startIndex, endIndex);
      
      return NextResponse.json({
        companies: paginatedCompanies,
        total: sampleCompanies.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(sampleCompanies.length / perPage),
        source: 'fallback',
        error: 'Database connection failed'
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
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
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}