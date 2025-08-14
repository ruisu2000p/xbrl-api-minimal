import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// APIキーの検証
async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey || !apiKey.startsWith('xbrl_')) {
    return false;
  }
  
  // Supabaseでキーを確認
  const keyHash = Buffer.from(apiKey).toString('base64');
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  // 有効期限とアクティブステータスをチェック
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (!data.is_active || expiresAt < now) {
    return false;
  }
  
  // 使用ログを記録
  await supabase.from('api_usage_logs').insert({
    api_key_id: data.id,
    endpoint: '/api/v1/companies/[id]',
    method: 'GET',
    status_code: 200,
    created_at: new Date().toISOString()
  });
  
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    // 開発環境では認証をスキップ（本番では削除）
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !await validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    const companyId = params.id;
    
    // 1. 企業情報と最新レポートを取得
    let { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        financial_reports (
          fiscal_year,
          fiscal_period,
          doc_type,
          financial_data,
          storage_path,
          markdown_content
        )
      `)
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      // ティッカーコードでも検索
      const { data: companyByTicker } = await supabase
        .from('companies')
        .select(`
          *,
          financial_reports (
            fiscal_year,
            fiscal_period,
            doc_type,
            financial_data,
            storage_path,
            markdown_content
          )
        `)
        .eq('ticker', companyId)
        .single();
      
      if (!companyByTicker) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      
      company = companyByTicker;
    }

    // 2. 最新レポートを選択
    const latestReport = company.financial_reports?.[0];
    
    // 3. Storageからフルコンテンツを取得（必要な場合）
    let fullContent = latestReport?.markdown_content || '';
    
    if (latestReport?.storage_path) {
      try {
        const { data: fileData, error: storageError } = await supabase.storage
          .from('markdown-files')
          .download(latestReport.storage_path);
        
        if (fileData && !storageError) {
          fullContent = await fileData.text();
        }
      } catch (storageErr) {
        console.error('Storage access error:', storageErr);
        // ストレージエラーは無視して、DBのコンテンツを使用
      }
    }

    // 4. レスポンスデータを構築
    const responseData = {
      id: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
      market: company.market,
      description: company.description,
      fiscal_year: latestReport?.fiscal_year || null,
      fiscal_period: latestReport?.fiscal_period || null,
      markdown: fullContent,
      financial_data: latestReport?.financial_data || {},
      metadata: {
        doc_type: latestReport?.doc_type || 'public',
        storage_path: latestReport?.storage_path || null,
        last_updated: company.updated_at
      }
    };

    // キャッシュヘッダーを設定してレスポンス
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
        'X-Company-ID': company.id,
        'X-Data-Source': 'supabase'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : undefined
      },
      { status: 500 }
    );
  }
}