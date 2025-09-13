// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractFinancialMetrics } from '@/lib/utils/financial-extractor';
import { FinancialMetrics } from '@/lib/types/financial-metrics';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/financial-metrics/[company_id]/[document_id] - 特定ドキュメントの財務指標抽出
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string; document_id: string } }
) {
  try {
    const { company_id, document_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const force_extract = searchParams.get('force_extract') === 'true';
    const include_raw_data = searchParams.get('include_raw_data') === 'true';

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // まず、既存の抽出結果があるかチェック
    let existingMetrics = null;
    if (!force_extract) {
      const { data: existing } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('company_id', company_id)
        .eq('document_id', document_id)
        .single();
      
      if (existing) {
        existingMetrics = existing;
      }
    }

    // 既存データがある場合はそれを返す
    if (existingMetrics && !force_extract) {
      return NextResponse.json({
        success: true,
        metrics: existingMetrics,
        cached: true,
        extracted_at: existingMetrics.extracted_at,
        status: 200
      });
    }

    // ドキュメントメタデータを取得
    const { data: document, error: docError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', company_id)
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Document not found: company_id=${company_id}, document_id=${document_id}`,
          status: 404
        },
        { status: 404 }
      );
    }

    // Storage からコンテンツを取得
    const { data: fileData, error: storageError } = await supabase.storage
      .from('markdown-files')
      .download(document.storage_path);
    
    if (storageError || !fileData) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch content: ${storageError?.message || 'Unknown storage error'}`,
          status: 500
        },
        { status: 500 }
      );
    }

    const content = await fileData.text();

    // 財務指標を抽出
    const extractionResult = extractFinancialMetrics(content, {
      company_id: document.company_id,
      company_name: document.company_name,
      fiscal_year: document.fiscal_year,
      document_id: document.id
    });

    if (!extractionResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Financial metrics extraction failed',
          details: extractionResult.errors,
          status: 500
        },
        { status: 500 }
      );
    }

    // 抽出結果をデータベースに保存
    if (extractionResult.metrics) {
      const { error: insertError } = await supabase
        .from('financial_metrics')
        .upsert(extractionResult.metrics, {
          onConflict: 'company_id,document_id'
        });

      if (insertError) {
        console.warn('Failed to save metrics to database:', insertError);
      }
    }

    // レスポンス作成
    const response: any = {
      success: true,
      metrics: extractionResult.metrics,
      cached: false,
      extraction_info: {
        confidence_score: extractionResult.metrics?.confidence_score,
        extraction_method: extractionResult.metrics?.extraction_method,
        source_sections: extractionResult.metrics?.source_sections
      },
      warnings: extractionResult.warnings,
      status: 200
    };

    if (include_raw_data) {
      response.raw_data = extractionResult.raw_data;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Financial metrics extraction error:', error);
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