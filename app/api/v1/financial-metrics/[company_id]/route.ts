// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractFinancialMetrics, analyzeFinancialTrends } from '@/lib/utils/financial-extractor';
import { FinancialMetrics, FinancialTimeSeries } from '@/lib/types/financial-metrics';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/financial-metrics/[company_id] - 企業の財務指標一覧と時系列分析
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string } }
) {
  try {
    const { company_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const fiscal_year = searchParams.get('fiscal_year');
    const include_trends = searchParams.get('include_trends') !== 'false';
    const force_extract = searchParams.get('force_extract') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 企業の基本情報を取得
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (!company) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Company not found: ${company_id}`,
          status: 404
        },
        { status: 404 }
      );
    }

    // 企業のドキュメント一覧を取得
    let documentsQuery = supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', company_id)
      .order('fiscal_year', { ascending: false })
      .limit(limit);

    if (fiscal_year) {
      documentsQuery = documentsQuery.eq('fiscal_year', fiscal_year);
    }

    const { data: documents, error: docsError } = await documentsQuery;

    if (docsError) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch documents: ${docsError.message}`,
          status: 500
        },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No documents found for company: ${company_id}`,
          status: 404
        },
        { status: 404 }
      );
    }

    // 既存の財務指標データを取得
    const { data: existingMetrics } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('company_id', company_id)
      .order('fiscal_year', { ascending: false });

    const existingMetricsMap = new Map(
      (existingMetrics || []).map(metric => [`${metric.document_id}`, metric])
    );

    const allMetrics: FinancialMetrics[] = [];
    const extractionResults: any[] = [];

    // 各ドキュメントの財務指標を処理
    for (const document of documents) {
      const existingMetric = existingMetricsMap.get(document.id);
      
      // 既存データがあり、force_extractでない場合はそれを使用
      if (existingMetric && !force_extract) {
        allMetrics.push(existingMetric);
        extractionResults.push({
          document_id: document.id,
          fiscal_year: document.fiscal_year,
          cached: true,
          confidence_score: existingMetric.confidence_score
        });
        continue;
      }

      // 新規抽出が必要な場合
      try {
        // Storage からコンテンツを取得
        const { data: fileData, error: storageError } = await supabase.storage
          .from('markdown-files')
          .download(document.storage_path);
        
        if (storageError || !fileData) {
          console.warn(`Failed to fetch content for ${document.storage_path}:`, storageError);
          extractionResults.push({
            document_id: document.id,
            fiscal_year: document.fiscal_year,
            error: 'Failed to fetch content',
            cached: false
          });
          continue;
        }

        const content = await fileData.text();

        // 財務指標を抽出
        const extractionResult = extractFinancialMetrics(content, {
          company_id: document.company_id,
          company_name: document.company_name,
          fiscal_year: document.fiscal_year,
          document_id: document.id
        });

        if (extractionResult.success && extractionResult.metrics) {
          allMetrics.push(extractionResult.metrics);
          
          // データベースに保存
          await supabase
            .from('financial_metrics')
            .upsert(extractionResult.metrics, {
              onConflict: 'company_id,document_id'
            });

          extractionResults.push({
            document_id: document.id,
            fiscal_year: document.fiscal_year,
            cached: false,
            confidence_score: extractionResult.metrics.confidence_score,
            extraction_method: extractionResult.metrics.extraction_method,
            warnings: extractionResult.warnings
          });
        } else {
          extractionResults.push({
            document_id: document.id,
            fiscal_year: document.fiscal_year,
            error: extractionResult.errors?.[0] || 'Extraction failed',
            cached: false
          });
        }
      } catch (error) {
        console.error(`Error processing document ${document.id}:`, error);
        extractionResults.push({
          document_id: document.id,
          fiscal_year: document.fiscal_year,
          error: error instanceof Error ? error.message : 'Unknown error',
          cached: false
        });
      }
    }

    // 時系列分析を実行
    let timeSeries: FinancialTimeSeries | null = null;
    if (include_trends && allMetrics.length >= 2) {
      const trends = analyzeFinancialTrends(allMetrics);
      if (trends) {
        timeSeries = {
          company_id,
          company_name: company.company_name || company.name,
          metrics: allMetrics,
          years: allMetrics.map(m => m.fiscal_year).sort(),
          trends
        };
      }
    }

    // 統計情報を計算
    const statistics = {
      total_documents: documents.length,
      metrics_extracted: allMetrics.length,
      cached_results: extractionResults.filter(r => r.cached).length,
      new_extractions: extractionResults.filter(r => !r.cached && !r.error).length,
      failed_extractions: extractionResults.filter(r => r.error).length,
      average_confidence: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / allMetrics.length 
        : 0,
      fiscal_years: [...new Set(allMetrics.map(m => m.fiscal_year))].sort()
    };

    // レスポンス作成
    return NextResponse.json({
      success: true,
      company: {
        company_id,
        company_name: company.company_name || company.name,
        ticker_code: company.ticker_code,
        sector: company.sector
      },
      metrics: allMetrics,
      time_series: timeSeries,
      statistics,
      extraction_results: extractionResults,
      filters: {
        company_id,
        fiscal_year,
        include_trends,
        limit
      },
      status: 200
    });

  } catch (error) {
    console.error('Financial metrics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500
      },
      { status: 500 }
    );
  }
}