// Companies テーブルとStorageを連携するAPIエンドポイント
// GET /api/v1/companies/[id]/data

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// APIキーの検証
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('xbrl_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const companyId = params.id;
    
    // 1. companiesテーブルから企業情報を取得
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found', company_id: companyId },
        { status: 404 }
      );
    }

    // 2. Storageから財務データ（Markdownファイル）を取得
    // ファイルパスの構造: company_id/PublicDoc_markdown/*.md
    const basePath = `${companyId}/PublicDoc_markdown`;
    
    // ファイル一覧を取得
    const { data: files, error: listError } = await supabase
      .storage
      .from('markdown-files')
      .list(basePath, {
        limit: 100,
        offset: 0
      });

    if (listError) {
      console.error('Storage list error:', listError);
      // ファイルが見つからない場合でも企業情報は返す
      return NextResponse.json({
        company,
        financial_data: null,
        documents: [],
        message: 'No financial documents found in storage'
      });
    }

    // 3. 主要な財務データファイルを特定して読み込む
    const documents = [];
    const financialData: any = {};

    if (files && files.length > 0) {
      // KPIや財務指標が含まれるファイルを優先的に取得
      const priorityFiles = [
        '0101010_honbun', // 企業の概況
        '0102010_honbun', // 事業の状況
        '0103010_honbun', // 設備の状況
        '0104010_honbun', // 提出会社の状況
        '0105000_honbun', // 経理の状況
      ];

      for (const file of files) {
        const fileName = file.name;
        
        // 優先ファイルかチェック
        const isPriority = priorityFiles.some(pf => fileName.includes(pf));
        
        if (isPriority || documents.length < 5) {
          // ファイルの内容を取得
          const filePath = `${basePath}/${fileName}`;
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('markdown-files')
            .download(filePath);
          
          if (!downloadError && fileData) {
            const content = await fileData.text();
            
            // 財務データを抽出（簡易版）
            if (fileName.includes('0101010')) {
              // 企業の概況から主要指標を抽出
              financialData.overview = extractFinancialMetrics(content);
            }
            
            documents.push({
              file_name: fileName,
              file_type: getFileType(fileName),
              content_preview: content.substring(0, 1000),
              content_length: content.length
            });
          }
        }
      }
    }

    // 4. レスポンスを構築
    return NextResponse.json({
      company,
      financial_data: financialData,
      documents,
      documents_count: files?.length || 0,
      storage_path: basePath,
      data_source: 'storage'
    }, {
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

// ファイルタイプを判定
function getFileType(fileName: string): string {
  if (fileName.includes('0000000_header')) return 'header';
  if (fileName.includes('0101010')) return 'company_overview';
  if (fileName.includes('0102010')) return 'business_status';
  if (fileName.includes('0103010')) return 'facilities';
  if (fileName.includes('0104010')) return 'company_info';
  if (fileName.includes('0105000')) return 'financial_status';
  return 'other';
}

// 財務指標を抽出（簡易版）
function extractFinancialMetrics(content: string): any {
  const metrics: any = {};
  
  // 売上高を探す
  const revenueMatch = content.match(/売上高[^0-9]*([0-9,]+)/);
  if (revenueMatch) {
    metrics.revenue = revenueMatch[1].replace(/,/g, '');
  }
  
  // 営業利益を探す
  const operatingIncomeMatch = content.match(/営業利益[^0-9]*([0-9,]+)/);
  if (operatingIncomeMatch) {
    metrics.operating_income = operatingIncomeMatch[1].replace(/,/g, '');
  }
  
  // 当期純利益を探す
  const netIncomeMatch = content.match(/当期純利益[^0-9]*([0-9,]+)/);
  if (netIncomeMatch) {
    metrics.net_income = netIncomeMatch[1].replace(/,/g, '');
  }
  
  return metrics;
}