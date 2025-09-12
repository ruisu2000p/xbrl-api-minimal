import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { Company, ApiResponse, FileMetadata } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/companies/[id]/data - 企業の財務データとStorageファイル取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    
    // APIキー検証
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== 'xbrl_demo') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid API key', status: 401 },
        { status: 401 }
      );
    }

    // Supabaseクライアント作成
    const supabase = createSupabaseServerClient();

    // 企業データ取得
    const { data: companyData, error: companyError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .or(`company_id.eq.${id},ticker_code.eq.${id}`)
      .single();

    if (companyError || !companyData) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Company not found', status: 404 },
        { status: 404 }
      );
    }

    // Storageからファイル一覧取得
    const storagePath = `markdown-files/FY${companyData.fiscal_year}/${companyData.company_id}/PublicDoc`;
    
    const { data: files, error: storageError } = await supabase
      .storage
      .from('markdown-files')
      .list(storagePath, {
        limit: 100,
        offset: 0
      });

    if (storageError) {
      console.error('Storage error:', storageError);
    }

    // ファイルURLの生成
    const fileUrls = files?.map(file => {
      const { data } = supabase
        .storage
        .from('markdown-files')
        .getPublicUrl(`${storagePath}/${file.name}`);
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        url: data.publicUrl,
        lastModified: file.updated_at
      };
    }) || [];

    // レスポンス作成
    const response = {
      data: {
        company: companyData as Company,
        files: fileUrls,
        metadata: {
          total_files: fileUrls.length,
          storage_path: storagePath
        }
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