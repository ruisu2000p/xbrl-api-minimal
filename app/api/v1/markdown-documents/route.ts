import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { ApiResponse } from '@/lib/types';

// GET /api/v1/markdown-documents - Markdownドキュメント取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const companyId = searchParams.get('company_id');
    const fiscalYear = searchParams.get('fiscal_year') || '2024';
    const documentType = searchParams.get('document_type') || 'PublicDoc';
    const fileName = searchParams.get('file_name');

    // APIキー検証
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== 'xbrl_demo') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid API key', status: 401 },
        { status: 401 }
      );
    }

    if (!companyId) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'company_id is required', status: 400 },
        { status: 400 }
      );
    }

    // Supabaseクライアント作成
    const supabase = createSupabaseServerClient();

    // ファイルパス構築
    let filePath: string;
    if (fileName) {
      filePath = `markdown-files/FY${fiscalYear}/${companyId}/${documentType}/${fileName}`;
    } else {
      // ファイル名が指定されていない場合は最初のファイルを取得
      const listPath = `markdown-files/FY${fiscalYear}/${companyId}/${documentType}`;
      
      const { data: files, error: listError } = await supabase
        .storage
        .from('markdown-files')
        .list(listPath, { limit: 1 });

      if (listError || !files || files.length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'No documents found', status: 404 },
          { status: 404 }
        );
      }

      filePath = `${listPath}/${files[0].name}`;
    }

    // ファイルダウンロード
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('markdown-files')
      .download(filePath.replace('markdown-files/', ''));

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to download document', status: 404 },
        { status: 404 }
      );
    }

    // ファイル内容を文字列に変換
    const content = await fileData.text();

    // レスポンス作成
    const response = {
      data: {
        company_id: companyId,
        fiscal_year: fiscalYear,
        document_type: documentType,
        file_path: filePath,
        content: content,
        size: fileData.size
      },
      status: 200
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error', status: 500 },
      { status: 500 }
    );
  }
}