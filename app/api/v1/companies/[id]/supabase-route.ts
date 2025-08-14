import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 企業データの型定義
interface Company {
  id: string;
  name: string;
  ticker?: string;
  industry?: string;
  market?: string;
  financial_reports?: any[];
}

// APIキーの検証
async function validateApiKey(apiKey: string | null) {
  if (!apiKey) return null;
  
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
    
    return error ? null : data;
  } catch {
    return null;
  }
}

// 使用状況の記録
async function logUsage(apiKeyId: string, endpoint: string, statusCode: number) {
  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        api_key_id: apiKeyId,
        endpoint,
        method: 'GET',
        status_code: statusCode,
        response_time: 50
      });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // APIキーの検証（オプション）
    const apiKey = request.headers.get('x-api-key');
    const keyData = await validateApiKey(apiKey);
    
    if (apiKey && !keyData) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const companyId = params.id;
    
    // 1. 企業情報と最新レポートを取得 - IDで検索
    const { data: companyById } = await supabase
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

    // 2. IDで見つからない場合はティッカーコードで検索
    let companyByTicker = null;
    if (!companyById) {
      const { data } = await supabase
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
      
      companyByTicker = data;
    }

    // 3. 最終的な企業データの選択（IDを優先、なければティッカー）
    const company = companyById ?? companyByTicker;
    
    if (!company) {
      if (keyData) {
        await logUsage(keyData.id, `/api/v1/companies/${params.id}`, 404);
      }
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // 4. 最新レポートを選択
    const latestReport = company.financial_reports?.[0];
    
    // 5. Storageからフルコンテンツを取得（必要な場合）
    let fullContent = latestReport?.markdown_content || '';
    
    if (latestReport?.storage_path) {
      try {
        const { data: storageData } = await supabase
          .storage
          .from('financial-reports')
          .download(latestReport.storage_path);
        
        if (storageData) {
          fullContent = await storageData.text();
        }
      } catch (error) {
        console.error('Failed to download from storage:', error);
      }
    }

    // 6. レスポンスの構築
    const response = {
      company: {
        id: company.id,
        name: company.name,
        ticker: company.ticker,
        industry: company.industry,
        market: company.market
      },
      latest_report: latestReport ? {
        fiscal_year: latestReport.fiscal_year,
        fiscal_period: latestReport.fiscal_period,
        doc_type: latestReport.doc_type,
        financial_data: latestReport.financial_data,
        content: fullContent
      } : null,
      available_years: company.financial_reports?.map((r: any) => r.fiscal_year) || []
    };

    // 使用状況の記録
    if (keyData) {
      await logUsage(keyData.id, `/api/v1/companies/${params.id}`, 200);
    }

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}