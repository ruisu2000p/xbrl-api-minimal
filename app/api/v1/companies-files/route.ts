import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // URLパラメータから企業IDを取得
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('id');
    const year = searchParams.get('year') || '2021';
    const fileIndex = searchParams.get('file');
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    const upperCompanyId = companyId.toUpperCase();
    
    // ストレージからファイル一覧を取得
    const { data: files, error: listError } = await supabase.storage
      .from('markdown-files')
      .list(`${year}/${upperCompanyId}`, { 
        limit: 100
      });
    
    if (listError) {
      console.error('Storage error:', listError);
      return NextResponse.json(
        { error: 'Failed to list files', details: listError.message },
        { status: 500 }
      );
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files found for this company' },
        { status: 404 }
      );
    }
    
    // ファイル一覧をソート
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    // 特定のファイルが要求された場合
    if (fileIndex !== null) {
      const index = parseInt(fileIndex);
      if (isNaN(index) || index < 0 || index >= files.length) {
        return NextResponse.json(
          { error: 'Invalid file index' },
          { status: 400 }
        );
      }
      
      const file = files[index];
      
      // ファイルの内容を取得
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('markdown-files')
        .download(`${year}/${upperCompanyId}/${file.name}`);
      
      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: 'Failed to download file' },
          { status: 500 }
        );
      }
      
      const content = await fileData.text();
      
      return NextResponse.json({
        company_id: upperCompanyId,
        year,
        file: {
          index,
          name: file.name,
          size: file.metadata?.size || 0,
          content
        }
      });
    }
    
    // ファイル一覧と概要を返す
    const fileList = files.map((file, index) => ({
      index,
      name: file.name,
      size: file.metadata?.size || 0,
      section: extractSectionName(file.name)
    }));
    
    // 最初のファイル（header）の内容を取得して企業名を抽出
    let companyName = '';
    if (files.length > 0) {
      try {
        const { data: headerData } = await supabase.storage
          .from('markdown-files')
          .download(`${year}/${upperCompanyId}/${files[0].name}`);
        
        if (headerData) {
          const headerContent = await headerData.text();
          const nameMatch = headerContent.match(/提出会社名】(.+)/);
          if (nameMatch) {
            companyName = nameMatch[1].trim();
          }
        }
      } catch (e) {
        console.error('Failed to extract company name:', e);
      }
    }
    
    return NextResponse.json({
      company_id: upperCompanyId,
      company_name: companyName,
      year,
      total_files: files.length,
      files: fileList,
      available_years: ['2021', '2022'],
      api_usage: {
        get_file_list: `/api/v1/companies-files?id=${upperCompanyId}&year=${year}`,
        get_specific_file: `/api/v1/companies-files?id=${upperCompanyId}&year=${year}&file=0`
      }
    });
    
  } catch (error: any) {
    console.error('Error in companies-files API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// ファイル名からセクション名を抽出
function extractSectionName(filename: string): string {
  const sections: { [key: string]: string } = {
    '0000000': 'ヘッダー情報',
    '0101010': '企業の概況',
    '0102010': '事業の状況',
    '0103010': '設備の状況',
    '0104010': '提出会社の状況',
    '0105000': '経理の状況',
    '0105010': '連結財務諸表',
    '0105020': '財務諸表',
    '0105310': '連結財務諸表',
    '0105320': '財務諸表',
    '0106010': 'コーポレートガバナンス',
    '0107010': '提出会社の株式事務',
    '0200010': '独立監査人の監査報告書',
    '0201010': '監査報告書'
  };
  
  const prefix = filename.substring(0, 7);
  return sections[prefix] || 'その他';
}