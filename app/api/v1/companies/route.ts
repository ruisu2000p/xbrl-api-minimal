import { NextRequest, NextResponse } from 'next/server';

// サンプル企業データ（実際はデータベースやファイルシステムから取得）
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
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const sector = searchParams.get('sector');
    const search = searchParams.get('search');

    // フィルタリング
    let filteredCompanies = [...sampleCompanies];
    
    if (sector) {
      filteredCompanies = filteredCompanies.filter(c => c.sector === sector);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCompanies = filteredCompanies.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.ticker.includes(search)
      );
    }

    // ページネーション
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

    return NextResponse.json({
      companies: paginatedCompanies,
      total: filteredCompanies.length,
      page,
      per_page: perPage,
      total_pages: Math.ceil(filteredCompanies.length / perPage)
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