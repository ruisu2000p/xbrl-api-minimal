/**
 * Secure Companies API Route
 * GitHub Security Alert #78 - 強化されたAPIセキュリティ
 */

import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/middleware/api-security-middleware';
import { NoSQLInjectionProtection } from '@/lib/security/nosql-injection-protection';
import { XSSProtectionEnhanced } from '@/lib/security/xss-protection-enhanced';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';

export async function GET(request: NextRequest) {
  return APISecurityMiddleware.secureAPIRoute(request, async (req) => {
    const startTime = Date.now();

    try {
      // 1. 認証確認
      const authResult = await authenticateRequest(req);
      if (!authResult.valid) {
        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'Please provide a valid API key'
          },
          { status: 401 }
        );
      }

      // 2. パラメータ取得とバリデーション
      const url = new URL(req.url);
      const rawFilters: Record<string, any> = {
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset'),
        company_name: url.searchParams.get('company_name'),
        fiscal_year: url.searchParams.get('fiscal_year'),
        document_type: url.searchParams.get('document_type'),
        cursor: url.searchParams.get('cursor'),
        sort: url.searchParams.get('sort')
      };

      // null値を除去
      const filters = Object.fromEntries(
        Object.entries(rawFilters).filter(([_, v]) => v !== null)
      );

      // 3. NoSQL Injection検証
      if (!NoSQLInjectionProtection.validateQueryObject(filters)) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            message: 'Query contains potentially harmful patterns'
          },
          { status: 400 }
        );
      }

      // 4. Supabaseクライアント作成
      const supabase = supabaseManager.getServiceClient();

      // 5. セキュアなクエリ構築
      let query = supabase
        .from('markdown_files_metadata')
        .select(`
          id,
          company_id,
          company_name,
          file_name,
          file_type,
          storage_path,
          fiscal_year,
          created_at,
          updated_at
        `);

      // NoSQL Injection対策を適用したクエリ構築
      query = NoSQLInjectionProtection.buildSafeQuery(query, filters);

      // 6. データ取得
      const { data, error, count } = await query;

      if (error) {
        console.error('Database query error:', error);
        return NextResponse.json(
          {
            error: 'Data retrieval failed',
            message: process.env.NODE_ENV === 'production'
              ? 'Unable to fetch data'
              : error.message
          },
          { status: 500 }
        );
      }

      // 7. レスポンスデータのサニタイゼーション
      const sanitizedData = XSSProtectionEnhanced.sanitizeForOutput(data || []);

      // 8. ページネーション情報の構築
      const limit = parseInt(filters.limit as string) || 50;
      const offset = parseInt(filters.offset as string) || 0;

      const paginationInfo = {
        total: count || 0,
        limit: limit,
        offset: offset,
        hasMore: (count || 0) > offset + limit,
        nextOffset: offset + limit
      };

      // カーソルベースのページネーション情報
      if (filters.cursor && Array.isArray(sanitizedData) && sanitizedData.length > 0) {
        const lastItem = sanitizedData[sanitizedData.length - 1];
        (paginationInfo as any).nextCursor = lastItem.id;
      }

      // 9. セキュアなレスポンス構築
      const responseData = {
        success: true,
        data: sanitizedData,
        pagination: paginationInfo,
        filters: {
          company_name: filters.company_name || null,
          fiscal_year: filters.fiscal_year || null,
          document_type: filters.document_type || null
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '2.0',
          security_level: 'enhanced',
          response_time: Date.now() - startTime
        }
      };

      // 10. キャッシュヘッダー設定（安全なデータのみ）
      const response = NextResponse.json(responseData);
      if (!filters.company_name) { // 個別検索でない場合のみキャッシュ
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
      }

      return response;

    } catch (error) {
      console.error('Secure API Route Error:', error);

      return NextResponse.json(
        {
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'production'
            ? 'Request processing failed'
            : (error as Error).message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST: 新しい企業データの追加（管理者のみ）
 */
export async function POST(request: NextRequest) {
  return APISecurityMiddleware.secureAPIRoute(request, async (req) => {
    try {
      // 認証と権限確認
      const authResult = await authenticateRequest(req, true); // 管理者権限必要
      if (!authResult.valid) {
        return NextResponse.json(
          { error: 'Admin authentication required' },
          { status: 403 }
        );
      }

      // リクエストボディ取得
      const body = await req.json();

      // NoSQL Injection検証
      if (!NoSQLInjectionProtection.validateQueryObject(body)) {
        return NextResponse.json(
          { error: 'Invalid request data' },
          { status: 400 }
        );
      }

      // 必須フィールドの検証
      const requiredFields = ['company_id', 'company_name', 'fiscal_year'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 }
          );
        }
      }

      // データのサニタイゼーション
      const sanitizedData = XSSProtectionEnhanced.sanitizeForOutput(body);

      // Supabaseに挿入
      const supabase = supabaseManager.getServiceClient();
      const { data, error } = await supabase
        .from('markdown_files_metadata')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create record' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: XSSProtectionEnhanced.sanitizeForOutput(data)
      }, { status: 201 });

    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * 認証処理
 */
// このルートは動的である必要があります（request.headersとrequest.urlを使用）
export const dynamic = 'force-dynamic'

async function authenticateRequest(
  request: NextRequest,
  requireAdmin: boolean = false
): Promise<{ valid: boolean; userId?: string }> {
  const apiKey = request.headers.get('X-API-Key') ||
                 request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return { valid: false };
  }

  // APIキーのフォーマット検証
  if (!apiKey.match(/^xbrl_[a-zA-Z0-9_-]+$/)) {
    return { valid: false };
  }

  const supabase = supabaseManager.getServiceClient();

  // APIキー検証（RPC関数使用）
  const { data, error } = await supabase
    .rpc('verify_api_key_enhanced', {
      p_api_key: apiKey,
      p_require_admin: requireAdmin
    });

  if (error || !data) {
    return { valid: false };
  }

  // 使用ログ記録
  await supabase
    .from('api_key_usage_logs')
    .insert({
      api_key_id: data.key_id,
      endpoint: request.url,
      method: request.method,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString()
    });

  return {
    valid: true,
    userId: data.user_id
  };
}

/**
 * OPTIONS: CORS プリフライト
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}