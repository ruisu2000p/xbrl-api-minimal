/**
 * Markdown検索API
 * GET /api/v1/markdown/search?q=keyword&limit=20
 * Claude Desktop MCP用
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { 
  authByApiKey, 
  checkRateLimit, 
  recordApiUsage, 
  getClientIp 
} from '@/app/api/_lib/authByApiKey';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // APIキー認証
    const auth = await authByApiKey(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // レート制限チェック
    const rateLimitOk = await checkRateLimit(
      auth.key.id,
      parseInt(process.env.API_RATE_LIMIT_PER_MIN || '60')
    );
    
    if (!rateLimitOk) {
      await recordApiUsage(
        auth.key.id,
        auth.userId,
        '/api/v1/markdown/search',
        'GET',
        429,
        Date.now() - startTime,
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    );
    const companyCode = searchParams.get('company_code');
    const fiscalYear = searchParams.get('fiscal_year');
    const docType = searchParams.get('doc_type');

    // 検索クエリを構築
    let dbQuery = admin
      .from('documents')
      .select('id, path, title, company_code, company_name, fiscal_year, doc_type, file_size, created_at')
      .limit(limit)
      .order('created_at', { ascending: false });

    // 検索条件を追加
    if (query) {
      // パス、タイトル、会社名で部分一致検索
      dbQuery = dbQuery.or(
        `path.ilike.%${query}%,title.ilike.%${query}%,company_name.ilike.%${query}%`
      );
    }

    if (companyCode) {
      dbQuery = dbQuery.eq('company_code', companyCode);
    }

    if (fiscalYear) {
      dbQuery = dbQuery.eq('fiscal_year', fiscalYear);
    }

    if (docType) {
      dbQuery = dbQuery.eq('doc_type', docType);
    }

    // データベースから検索
    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      
      await recordApiUsage(
        auth.key.id,
        auth.userId,
        '/api/v1/markdown/search',
        'GET',
        500,
        Date.now() - startTime,
        getClientIp(req),
        req.headers.get('user-agent') || undefined
      );
      
      return NextResponse.json(
        { success: false, error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 成功時のログ記録
    const responseTime = Date.now() - startTime;
    await recordApiUsage(
      auth.key.id,
      auth.userId,
      '/api/v1/markdown/search',
      'GET',
      200,
      responseTime,
      getClientIp(req),
      req.headers.get('user-agent') || undefined
    );

    // レスポンス
    return NextResponse.json({
      results: data || [],
      count: data?.length || 0,
      query: {
        q: query,
        company_code: companyCode,
        fiscal_year: fiscalYear,
        doc_type: docType,
        limit,
      },
      responseTimeMs: responseTime,
    });
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/v1/markdown/search
 * CORS対応
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}