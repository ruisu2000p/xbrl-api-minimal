import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// APIキー検証
async function validateApiKey(apiKey: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // APIキーの検証（簡易版）
  if (!apiKey || !apiKey.startsWith('xbrl_')) {
    return false;
  }
  
  // TODO: データベースでAPIキーを検証
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // APIキー検証
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const fiscalYear = searchParams.get('fiscal_year');
    const documentType = searchParams.get('document_type');
    const sectionType = searchParams.get('section_type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // クエリ構築
    let query = supabase
      .from('markdown_files_metadata')
      .select('*');

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

    // ページネーション
    query = query
      .range(offset, offset + limit - 1)
      .order('fiscal_year', { ascending: false })
      .order('company_id', { ascending: true })
      .order('file_order', { ascending: true });

    // データ取得
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
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
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: ファイル内容を取得
export async function POST(request: NextRequest) {
  try {
    // APIキー検証
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // リクエストボディ取得
    const body = await request.json();
    const { file_path, storage_path } = body;

    if (!file_path && !storage_path) {
      return NextResponse.json(
        { error: 'file_path or storage_path is required' },
        { status: 400 }
      );
    }

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // メタデータ取得
    let metadata;
    if (file_path) {
      const { data, error } = await supabase
        .from('markdown_files_metadata')
        .select('*')
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

    // Storageからファイル内容を取得
    const storagePath = metadata.storage_path || `markdown-files/${metadata.file_path}`;
    const cleanPath = storagePath.replace('markdown-files/', '');

    try {
      // ファイルダウンロード
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('markdown-files')
        .download(cleanPath);

      if (downloadError) {
        console.error('Storage download error:', downloadError);
        return NextResponse.json(
          { error: 'Failed to download file', details: downloadError.message },
          { status: 500 }
        );
      }

      if (!fileData) {
        return NextResponse.json(
          { error: 'File content is empty' },
          { status: 404 }
        );
      }

      // ファイル内容をテキストとして読み取り
      const content = await fileData.text();

      // レスポンス構築
      const response = {
        success: true,
        metadata,
        content,
        contentLength: content.length,
        downloadUrl: null // 必要に応じて署名付きURLを生成
      };

      // 署名付きURL生成（オプション）
      const { data: signedUrlData } = await supabase.storage
        .from('markdown-files')
        .createSignedUrl(cleanPath, 3600); // 1時間有効

      if (signedUrlData) {
        response.downloadUrl = signedUrlData.signedUrl;
      }

      return NextResponse.json(response);

    } catch (storageError) {
      console.error('Storage access error:', storageError);
      return NextResponse.json(
        { error: 'Failed to access file content' },
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