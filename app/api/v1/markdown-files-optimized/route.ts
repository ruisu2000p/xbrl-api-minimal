import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabaseクライアントをグローバルに保持（接続の再利用）
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

// 簡易APIキー検証（高速化のため）
function validateApiKey(apiKey: string | null): boolean {
  // 開発環境では簡易チェックのみ
  if (process.env.NODE_ENV === 'development') {
    return true; // 開発環境では認証をスキップ
  }
  
  if (!apiKey || !apiKey.startsWith('xbrl_')) {
    return false;
  }
  
  return true;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // APIキー検証（簡略化）
    const apiKey = request.headers.get('X-API-Key');
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Supabaseクライアント取得（再利用）
    const supabase = getSupabaseClient();

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const fiscalYear = searchParams.get('fiscal_year');
    const documentType = searchParams.get('document_type');
    const sectionType = searchParams.get('section_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // 最大100に制限
    const offset = parseInt(searchParams.get('offset') || '0');

    // クエリ構築（最適化）
    let query = supabase
      .from('markdown_files_metadata')
      .select('id, file_path, company_id, fiscal_year, document_type, section_type, file_name, file_size', { count: 'exact' });

    // フィルタ適用
    if (companyId) {
      query = query.eq('company_id', companyId.toUpperCase());
    }
    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }
    if (documentType) {
      query = query.eq('document_type', documentType);
    }
    if (sectionType) {
      query = query.eq('section_type', sectionType);
    }

    // ページネーションとソート（インデックスを活用）
    query = query
      .range(offset, offset + limit - 1)
      .order('id', { ascending: true }); // idでソート（高速）

    // データ取得
    const { data, error, count } = await query;

    const queryTime = Date.now() - startTime;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data', details: error.message },
        { status: 500 }
      );
    }

    // レスポンス構築
    const response = {
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      },
      metadata: {
        filters: {
          company_id: companyId,
          fiscal_year: fiscalYear,
          document_type: documentType,
          section_type: sectionType
        },
        queryTime: `${queryTime}ms`
      }
    };

    // キャッシュヘッダー設定（静的データの場合）
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: ファイル内容を取得（最適化版）
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // APIキー検証（簡略化）
    const apiKey = request.headers.get('X-API-Key');
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // リクエストボディ取得
    const body = await request.json();
    const { file_path, storage_path, content_only = false } = body;

    if (!file_path && !storage_path) {
      return NextResponse.json(
        { error: 'file_path or storage_path is required' },
        { status: 400 }
      );
    }

    // Supabaseクライアント取得（再利用）
    const supabase = getSupabaseClient();

    // メタデータ取得（content_onlyの場合はスキップ）
    let metadata = null;
    if (!content_only) {
      if (file_path) {
        const { data, error } = await supabase
          .from('markdown_files_metadata')
          .select('id, file_path, company_id, fiscal_year, document_type, section_type, file_name, storage_path')
          .eq('file_path', file_path)
          .single();

        if (error || !data) {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }
        metadata = data;
      } else {
        metadata = { storage_path };
      }
    }

    const storagePath = storage_path || metadata?.storage_path || `markdown-files/${file_path}`;
    const cleanPath = storagePath.replace('markdown-files/', '');

    try {
      // 署名付きURLを生成（ダウンロードより高速）
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('markdown-files')
        .createSignedUrl(cleanPath, 3600); // 1時間有効

      if (urlError || !signedUrlData) {
        console.error('Signed URL error:', urlError);
        return NextResponse.json(
          { error: 'Failed to generate download URL' },
          { status: 500 }
        );
      }

      const queryTime = Date.now() - startTime;

      // content_onlyモードの場合は、URLのみ返す（高速）
      if (content_only) {
        return NextResponse.json({
          success: true,
          downloadUrl: signedUrlData.signedUrl,
          queryTime: `${queryTime}ms`
        });
      }

      // 通常モード：メタデータとURLを返す
      const response = {
        success: true,
        metadata,
        downloadUrl: signedUrlData.signedUrl,
        queryTime: `${queryTime}ms`,
        note: 'Use downloadUrl to fetch content directly for better performance'
      };

      return NextResponse.json(response);

    } catch (storageError) {
      console.error('Storage access error:', storageError);
      return NextResponse.json(
        { error: 'Failed to access file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}