// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FinancialMetrics, CompanyComparison } from '@/lib/types/financial-metrics';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// 業界平均を計算
function calculateIndustryAverage(metrics: FinancialMetrics[], sector: string): Partial<FinancialMetrics> {
  if (metrics.length === 0) return {};
  
  const fields = [
    'revenue', 'operating_profit', 'ordinary_profit', 'net_income',
    'total_assets', 'net_assets', 'roe', 'roa', 'operating_margin', 'net_margin'
  ];
  
  const averages: any = {};
  
  for (const field of fields) {
    const values = metrics
      .map(m => (m as any)[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length > 0) {
      averages[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  }
  
  return averages;
}

// ランキングを作成
function createRankings(metrics: FinancialMetrics[]): any {
  const fields = ['revenue', 'operating_profit', 'net_income', 'total_assets', 'roe', 'roa'];
  const rankings: any = {};
  
  for (const field of fields) {
    const validMetrics = metrics
      .filter(m => (m as any)[field] !== null && (m as any)[field] !== undefined)
      .map(m => ({
        company_id: m.company_id,
        company_name: m.company_name,
        value: (m as any)[field]
      }))
      .sort((a, b) => b.value - a.value); // 降順
    
    rankings[field] = validMetrics.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }
  
  return rankings;
}

// GET /api/v1/financial-metrics - 財務指標検索・比較API
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const company_ids = searchParams.get('company_ids')?.split(',') || [];
    const sector = searchParams.get('sector');
    const fiscal_year = searchParams.get('fiscal_year') || '2024';
    const compare_industry = searchParams.get('compare_industry') === 'true';
    const include_rankings = searchParams.get('include_rankings') === 'true';
    const min_revenue = searchParams.get('min_revenue');
    const max_revenue = searchParams.get('max_revenue');
    const min_roe = searchParams.get('min_roe');
    const max_roe = searchParams.get('max_roe');
    const sort_by = searchParams.get('sort_by') || 'revenue';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // クエリ構築
    let query = supabase
      .from('financial_metrics')
      .select(`
        *,
        companies!financial_metrics_company_id_fkey (
          id,
          company_name,
          ticker_code,
          sector
        )
      `, { count: 'exact' })
      .eq('fiscal_year', fiscal_year);

    // 条件フィルタリング
    if (company_ids.length > 0) {
      query = query.in('company_id', company_ids);
    }

    if (sector) {
      query = query.eq('companies.sector', sector);
    }

    if (min_revenue) {
      query = query.gte('revenue', parseFloat(min_revenue));
    }

    if (max_revenue) {
      query = query.lte('revenue', parseFloat(max_revenue));
    }

    if (min_roe) {
      query = query.gte('roe', parseFloat(min_roe));
    }

    if (max_roe) {
      query = query.lte('roe', parseFloat(max_roe));
    }

    // ソート
    const isValidSortField = [
      'revenue', 'operating_profit', 'ordinary_profit', 'net_income',
      'total_assets', 'net_assets', 'roe', 'roa', 'operating_margin', 'net_margin'
    ].includes(sort_by);
    
    if (isValidSortField) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' });
    } else {
      query = query.order('revenue', { ascending: false });
    }

    // ページネーション
    const offset = (page - 1) * per_page;
    query = query.range(offset, offset + per_page - 1);

    // データ取得
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          status: 500
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          per_page,
          total: 0,
          total_pages: 0
        },
        status: 200
      });
    }

    // 比較分析の実行
    let comparison: CompanyComparison | null = null;
    let industryAverage: Partial<FinancialMetrics> | null = null;
    let rankings: any = null;

    if (compare_industry && sector) {
      // 同業界の全データを取得（業界平均計算用）
      const { data: industryData } = await supabase
        .from('financial_metrics')
        .select(`
          *,
          companies!financial_metrics_company_id_fkey (sector)
        `)
        .eq('fiscal_year', fiscal_year)
        .eq('companies.sector', sector);

      if (industryData && industryData.length > 0) {
        industryAverage = calculateIndustryAverage(industryData as FinancialMetrics[], sector);
      }
    }

    if (include_rankings) {
      rankings = createRankings(data as FinancialMetrics[]);
    }

    // 統計情報を計算
    const validMetrics = data.filter(m => m.revenue && m.revenue > 0);
    const statistics = {
      total_companies: data.length,
      companies_with_revenue: validMetrics.length,
      average_revenue: validMetrics.length > 0 
        ? validMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0) / validMetrics.length 
        : 0,
      average_roe: data.filter(m => m.roe).length > 0
        ? data.filter(m => m.roe).reduce((sum, m) => sum + (m.roe || 0), 0) / data.filter(m => m.roe).length
        : 0,
      sectors: [...new Set(data.map(m => m.companies?.sector).filter(Boolean))],
      confidence_scores: {
        min: Math.min(...data.map(m => m.confidence_score || 0)),
        max: Math.max(...data.map(m => m.confidence_score || 0)),
        average: data.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / data.length
      }
    };

    // レスポンス作成
    return NextResponse.json({
      success: true,
      data: data.map(metric => ({
        ...metric,
        company_name: metric.companies?.company_name || metric.company_name,
        ticker_code: metric.companies?.ticker_code,
        sector: metric.companies?.sector
      })),
      industry_average: industryAverage,
      rankings,
      statistics,
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      },
      filters: {
        company_ids: company_ids.length > 0 ? company_ids : undefined,
        sector,
        fiscal_year,
        min_revenue,
        max_revenue,
        min_roe,
        max_roe,
        sort_by,
        sort_order
      },
      status: 200
    });

  } catch (error) {
    console.error('Financial metrics search API error:', error);
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