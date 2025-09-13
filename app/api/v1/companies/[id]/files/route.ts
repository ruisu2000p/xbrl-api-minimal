// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// APIキーの検証
async function validateApiKey(apiKey: string | null) {
  if (!apiKey) return null;
  
  // デモ用: xbrl_で始まるキーを有効とする
  if (apiKey.startsWith('xbrl_')) {
    return { id: 'demo', key: apiKey };
  }
  
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create Supabase client inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // APIキーの検証（オプション）
    const apiKey = request.headers.get('x-api-key');
    const keyData = await validateApiKey(apiKey);
    
    if (apiKey && !keyData) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const companyId = params.id.toUpperCase();
    
    // URLパラメータから年度とファイルインデックスを取得
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2021';
    const fileIndex = searchParams.get('file');
    
    // ストレージからファイル一覧を取得
    const { data: files, error: listError } = await supabase.storage
      .from('markdown-files')
      .list(`${year}/${companyId}`, { 
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (listError || !files) {
      return NextResponse.json(
        { success: false, error: 'Company not found or no files available' },
        { status: 404 }
      );
    }
    
    // 特定のファイルが要求された場合
    if (fileIndex !== null) {
      const index = parseInt(fileIndex);
      if (isNaN(index) || index < 0 || index >= files.length) {
        return NextResponse.json(
          { success: false, error: 'Invalid file index' },
          { status: 400 }
        );
      }
      
      const file = files[index];
      
      // ファイルの内容を取得
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('markdown-files')
        .download(`${year}/${companyId}/${file.name}`);
      
      if (downloadError || !fileData) {
        return NextResponse.json(
          { success: false, error: 'Failed to download file' },
          { status: 500 }
        );
      }
      
      const content = await fileData.text();
      
      return NextResponse.json({
        company_id: companyId,
        year,
        file: {
          index,
          name: file.name,
          size: file.metadata?.size || 0,
          content
        }
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
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
      const { data: headerData } = await supabase.storage
        .from('markdown-files')
        .download(`${year}/${companyId}/${files[0].name}`);
      
      if (headerData) {
        const headerContent = await headerData.text();
        const nameMatch = headerContent.match(/提出会社名】(.+)/);
        if (nameMatch) {
          companyName = nameMatch[1].trim();
        }
      }
    }
    
    return NextResponse.json({
      company_id: companyId,
      company_name: companyName,
      year,
      total_files: files.length,
      files: fileList,
      available_years: ['2021', '2022'], // 実際はデータベースから取得
      instructions: {
        get_file: `Add ?file={index} to get specific file content (0-${files.length - 1})`,
        example: `/api/v1/companies/${companyId}/files?year=${year}&file=0`
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Error fetching company files:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
    '0105310': '連結財務諸表',
    '0105320': '財務諸表',
    '0106010': 'コーポレートガバナンス',
    '0107010': '提出会社の株式事務',
    '0201010': '監査報告書'
  };
  
  const prefix = filename.substring(0, 7);
  return sections[prefix] || 'その他';
}