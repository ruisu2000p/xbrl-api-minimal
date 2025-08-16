import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// APIキー検証（本番用）
async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; keyId?: string; error?: string }> {
  const apiKey = request.headers.get('X-API-Key') || 
                 request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return { valid: false, error: 'No API key provided' };
  }
  
  // 本番環境でテストキーをブロック
  if (process.env.NODE_ENV === 'production' && apiKey.startsWith('xbrl_live_test')) {
    return { valid: false, error: 'Test keys are not allowed in production' };
  }
  
  // APIキーハッシュ化
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // データベースで検証
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .single();
  
  if (error || !keyData) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // 有効期限チェック
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    await supabase
      .from('api_keys')
      .update({ status: 'expired' })
      .eq('id', keyData.id);
    return { valid: false, error: 'API key expired' };
  }
  
  return { valid: true, keyId: keyData.id };
}

// レート制限チェック
async function checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining?: number }> {
  const { data: rateLimit, error } = await supabase
    .from('api_key_rate_limits')
    .select('*')
    .eq('api_key_id', apiKeyId)
    .single();
  
  if (error || !rateLimit) {
    return { allowed: false };
  }
  
  const now = new Date();
  const lastReset = new Date(rateLimit.last_reset_at);
  const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  
  // 1時間経過したらリセット
  if (hoursDiff >= 1) {
    await supabase
      .from('api_key_rate_limits')
      .update({
        current_hour_count: 0,
        last_reset_at: now.toISOString()
      })
      .eq('api_key_id', apiKeyId);
    
    return { 
      allowed: true, 
      remaining: rateLimit.requests_per_hour - 1 
    };
  }
  
  // レート制限チェック
  if (rateLimit.current_hour_count >= rateLimit.requests_per_hour) {
    return { 
      allowed: false, 
      remaining: 0 
    };
  }
  
  // カウンター更新
  await supabase
    .from('api_key_rate_limits')
    .update({
      current_hour_count: rateLimit.current_hour_count + 1
    })
    .eq('api_key_id', apiKeyId);
  
  return { 
    allowed: true, 
    remaining: rateLimit.requests_per_hour - rateLimit.current_hour_count - 1 
  };
}

// ログ記録
async function logApiUsage(
  apiKeyId: string | null,
  request: NextRequest,
  statusCode: number,
  responseTime: number,
  errorMessage?: string
) {
  if (!apiKeyId) return;
  
  try {
    await supabase
      .from('api_key_usage_logs')
      .insert({
        api_key_id: apiKeyId,
        endpoint: '/api/v1/companies',
        method: 'GET',
        status_code: statusCode,
        response_time_ms: responseTime,
        ip_address: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        error_message: errorMessage
      });
    
    // 統計更新
    if (statusCode >= 200 && statusCode < 300) {
      await supabase.rpc('increment_api_key_stats', {
        key_id: apiKeyId,
        success: true
      });
    } else {
      await supabase.rpc('increment_api_key_stats', {
        key_id: apiKeyId,
        success: false
      });
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let apiKeyId: string | null = null;
  
  try {
    // 1. APIキー検証
    const authResult = await validateApiKey(request);
    
    if (!authResult.valid) {
      await logApiUsage(null, request, 401, Date.now() - startTime, authResult.error);
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: authResult.error 
        },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="XBRL API"'
          }
        }
      );
    }
    
    apiKeyId = authResult.keyId!;
    
    // 2. レート制限チェック
    const rateLimitResult = await checkRateLimit(apiKeyId);
    
    if (!rateLimitResult.allowed) {
      await logApiUsage(apiKeyId, request, 429, Date.now() - startTime, 'Rate limit exceeded');
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retry_after: 3600
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
            'Retry-After': '3600'
          }
        }
      );
    }
    
    // 3. クエリパラメータ処理
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '100'), 1000);
    const sector = searchParams.get('sector');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'id';
    const sortOrder = searchParams.get('sort_order') || 'asc';
    
    // 4. データベースクエリ構築
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
    
    // ソート
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // ページネーション
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);
    
    // 5. データ取得
    const { data: companies, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      await logApiUsage(apiKeyId, request, 500, Date.now() - startTime, error.message);
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: 'Failed to fetch data'
        },
        { status: 500 }
      );
    }
    
    // 6. 成功レスポンス
    await logApiUsage(apiKeyId, request, 200, Date.now() - startTime);
    
    const response = {
      companies: companies || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      metadata: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      }
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining || 999),
        'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
        'X-Request-Id': response.metadata.request_id
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    await logApiUsage(
      apiKeyId, 
      request, 
      500, 
      Date.now() - startTime, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        request_id: crypto.randomUUID()
      },
      { status: 500 }
    );
  }
}

// OPTIONS メソッド（CORS対応）
export async function OPTIONS(request: NextRequest) {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = request.headers.get('origin') || '';
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-API-Key, Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
  }
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}