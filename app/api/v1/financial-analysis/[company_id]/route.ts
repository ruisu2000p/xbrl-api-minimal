// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FinancialMetrics, FinancialAnalysisReport } from '@/lib/types/financial-metrics';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// 財務健全性スコアを計算
function calculateFinancialHealthScore(metrics: FinancialMetrics): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    liquidity: number;
    profitability: number;
    efficiency: number;
    leverage: number;
  };
} {
  const factors = {
    liquidity: 0,
    profitability: 0,
    efficiency: 0,
    leverage: 0
  };

  // 流動性（25点満点）
  if (metrics.current_ratio) {
    if (metrics.current_ratio >= 200) factors.liquidity = 25;
    else if (metrics.current_ratio >= 150) factors.liquidity = 20;
    else if (metrics.current_ratio >= 120) factors.liquidity = 15;
    else if (metrics.current_ratio >= 100) factors.liquidity = 10;
    else factors.liquidity = 5;
  }

  // 収益性（30点満点）
  let profitabilityScore = 0;
  if (metrics.roe && metrics.roe > 0) {
    if (metrics.roe >= 20) profitabilityScore += 10;
    else if (metrics.roe >= 15) profitabilityScore += 8;
    else if (metrics.roe >= 10) profitabilityScore += 6;
    else if (metrics.roe >= 5) profitabilityScore += 4;
    else profitabilityScore += 2;
  }
  if (metrics.operating_margin && metrics.operating_margin > 0) {
    if (metrics.operating_margin >= 15) profitabilityScore += 10;
    else if (metrics.operating_margin >= 10) profitabilityScore += 8;
    else if (metrics.operating_margin >= 5) profitabilityScore += 6;
    else profitabilityScore += 4;
  }
  if (metrics.net_margin && metrics.net_margin > 0) {
    if (metrics.net_margin >= 10) profitabilityScore += 10;
    else if (metrics.net_margin >= 7) profitabilityScore += 8;
    else if (metrics.net_margin >= 3) profitabilityScore += 6;
    else profitabilityScore += 4;
  }
  factors.profitability = Math.min(30, profitabilityScore);

  // 効率性（25点満点）
  if (metrics.roa && metrics.roa > 0) {
    if (metrics.roa >= 10) factors.efficiency = 25;
    else if (metrics.roa >= 7) factors.efficiency = 20;
    else if (metrics.roa >= 5) factors.efficiency = 15;
    else if (metrics.roa >= 2) factors.efficiency = 10;
    else factors.efficiency = 5;
  }

  // レバレッジ（20点満点）
  if (metrics.debt_to_equity_ratio !== undefined) {
    if (metrics.debt_to_equity_ratio <= 50) factors.leverage = 20;
    else if (metrics.debt_to_equity_ratio <= 100) factors.leverage = 15;
    else if (metrics.debt_to_equity_ratio <= 200) factors.leverage = 10;
    else if (metrics.debt_to_equity_ratio <= 300) factors.leverage = 5;
    else factors.leverage = 0;
  }

  const totalScore = factors.liquidity + factors.profitability + factors.efficiency + factors.leverage;

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 60) grade = 'B';
  else if (totalScore >= 40) grade = 'C';
  else if (totalScore >= 20) grade = 'D';
  else grade = 'F';

  return {
    score: totalScore,
    grade,
    factors
  };
}

// 成長性分析
function analyzeGrowth(metricsArray: FinancialMetrics[]): {
  revenue_growth: number;
  profit_growth: number;
  asset_growth: number;
  growth_stage: 'high_growth' | 'stable_growth' | 'mature' | 'declining';
} {
  if (metricsArray.length < 2) {
    return {
      revenue_growth: 0,
      profit_growth: 0,
      asset_growth: 0,
      growth_stage: 'mature'
    };
  }

  const sorted = metricsArray.sort((a, b) => a.fiscal_year.localeCompare(b.fiscal_year));
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const years = sorted.length - 1;

  // 年平均成長率を計算（CAGR）
  const calculateCAGR = (start: number, end: number, periods: number): number => {
    if (start <= 0 || end <= 0 || periods <= 0) return 0;
    return (Math.pow(end / start, 1 / periods) - 1) * 100;
  };

  const revenue_growth = calculateCAGR(oldest.revenue || 0, newest.revenue || 0, years);
  const profit_growth = calculateCAGR(oldest.net_income || 0, newest.net_income || 0, years);
  const asset_growth = calculateCAGR(oldest.total_assets || 0, newest.total_assets || 0, years);

  // 成長ステージを判定
  let growth_stage: 'high_growth' | 'stable_growth' | 'mature' | 'declining';
  const avgGrowth = (revenue_growth + profit_growth + asset_growth) / 3;

  if (avgGrowth >= 15) growth_stage = 'high_growth';
  else if (avgGrowth >= 5) growth_stage = 'stable_growth';
  else if (avgGrowth >= -2) growth_stage = 'mature';
  else growth_stage = 'declining';

  return {
    revenue_growth,
    profit_growth,
    asset_growth,
    growth_stage
  };
}

// リスク評価
function assessRisk(metrics: FinancialMetrics, industryAverage?: Partial<FinancialMetrics>): {
  financial_risk: 'low' | 'medium' | 'high';
  business_risk: 'low' | 'medium' | 'high';
  market_risk: 'low' | 'medium' | 'high';
  overall_risk: 'low' | 'medium' | 'high';
} {
  // 財務リスク
  let financial_risk: 'low' | 'medium' | 'high' = 'low';
  if (metrics.debt_to_equity_ratio && metrics.debt_to_equity_ratio > 200) financial_risk = 'high';
  else if (metrics.debt_to_equity_ratio && metrics.debt_to_equity_ratio > 100) financial_risk = 'medium';

  if (metrics.current_ratio && metrics.current_ratio < 100) {
    financial_risk = financial_risk === 'high' ? 'high' : 'medium';
  }

  // 事業リスク
  let business_risk: 'low' | 'medium' | 'high' = 'low';
  if (metrics.operating_margin && metrics.operating_margin < 5) business_risk = 'high';
  else if (metrics.operating_margin && metrics.operating_margin < 10) business_risk = 'medium';

  // 市場リスク（業界平均との比較）
  let market_risk: 'low' | 'medium' | 'high' = 'low';
  if (industryAverage) {
    const revenueVsIndustry = metrics.revenue && industryAverage.revenue 
      ? metrics.revenue / industryAverage.revenue 
      : 1;
    
    if (revenueVsIndustry < 0.7) market_risk = 'high';
    else if (revenueVsIndustry < 0.9) market_risk = 'medium';
  }

  // 総合リスク
  const risks = [financial_risk, business_risk, market_risk];
  const highCount = risks.filter(r => r === 'high').length;
  const mediumCount = risks.filter(r => r === 'medium').length;

  let overall_risk: 'low' | 'medium' | 'high' = 'low';
  if (highCount >= 2) overall_risk = 'high';
  else if (highCount >= 1 || mediumCount >= 2) overall_risk = 'medium';

  return {
    financial_risk,
    business_risk,
    market_risk,
    overall_risk
  };
}

// 推奨事項を生成
function generateRecommendations(
  metrics: FinancialMetrics,
  healthScore: any,
  growthAnalysis: any,
  riskAssessment: any
): string[] {
  const recommendations: string[] = [];

  // 流動性に関する推奨事項
  if (healthScore.factors.liquidity < 15) {
    recommendations.push('流動比率の改善が必要です。短期債務の削減または流動資産の増強を検討してください。');
  }

  // 収益性に関する推奨事項
  if (healthScore.factors.profitability < 20) {
    recommendations.push('収益性の向上が課題です。コスト削減や事業効率化を検討してください。');
  }

  // 成長性に関する推奨事項
  if (growthAnalysis.growth_stage === 'declining') {
    recommendations.push('事業の成長戦略の見直しが必要です。新規事業や市場開拓を検討してください。');
  } else if (growthAnalysis.growth_stage === 'high_growth') {
    recommendations.push('高い成長率を維持していますが、持続可能性に注意してください。');
  }

  // リスクに関する推奨事項
  if (riskAssessment.financial_risk === 'high') {
    recommendations.push('財務リスクが高い状態です。負債の削減や財務構造の改善を優先してください。');
  }

  if (riskAssessment.overall_risk === 'high') {
    recommendations.push('総合的なリスク管理の強化が必要です。リスク管理体制の見直しを推奨します。');
  }

  // デフォルト推奨事項
  if (recommendations.length === 0) {
    recommendations.push('現在の財務状況は良好です。継続的な成長と安定性の維持に努めてください。');
  }

  return recommendations;
}

// GET /api/v1/financial-analysis/[company_id] - 企業の包括的財務分析
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string } }
) {
  try {
    const { company_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const fiscal_year = searchParams.get('fiscal_year') || '2024';
    const years_back = parseInt(searchParams.get('years_back') || '5');

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

    // 指定年度の財務指標を取得
    const { data: currentMetrics } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('company_id', company_id)
      .eq('fiscal_year', fiscal_year)
      .single();

    if (!currentMetrics) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No financial metrics found for company ${company_id} in ${fiscal_year}`,
          status: 404
        },
        { status: 404 }
      );
    }

    // 過去数年間の財務指標を取得
    const { data: historicalMetrics } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('company_id', company_id)
      .order('fiscal_year', { ascending: false })
      .limit(years_back);

    // 業界平均データを取得
    const { data: industryData } = await supabase
      .from('financial_metrics')
      .select(`
        *,
        companies!financial_metrics_company_id_fkey (sector)
      `)
      .eq('fiscal_year', fiscal_year)
      .eq('companies.sector', company.sector || '');

    const industryAverage = industryData && industryData.length > 0
      ? industryData.reduce((acc: any, item: any) => {
          const fields = ['revenue', 'roe', 'roa', 'operating_margin', 'net_margin'];
          fields.forEach(field => {
            if (item[field]) {
              acc[field] = (acc[field] || 0) + item[field];
            }
          });
          return acc;
        }, {})
      : null;

    if (industryAverage && industryData) {
      Object.keys(industryAverage).forEach(key => {
        industryAverage[key] = industryAverage[key] / industryData.length;
      });
    }

    // 財務分析を実行
    const healthScore = calculateFinancialHealthScore(currentMetrics);
    const growthAnalysis = analyzeGrowth(historicalMetrics || [currentMetrics]);
    const riskAssessment = assessRisk(currentMetrics, industryAverage);
    const recommendations = generateRecommendations(
      currentMetrics,
      healthScore,
      growthAnalysis,
      riskAssessment
    );

    // 分析レポートを作成
    const report: FinancialAnalysisReport = {
      company_id,
      company_name: company.company_name || company.name,
      fiscal_year,
      financial_health: healthScore,
      growth_analysis: growthAnalysis,
      risk_assessment: riskAssessment,
      recommendations,
      generated_at: new Date().toISOString()
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
      current_metrics: currentMetrics,
      historical_metrics: historicalMetrics,
      industry_average: industryAverage,
      analysis_report: report,
      analysis_period: {
        target_year: fiscal_year,
        historical_years: years_back,
        data_points: historicalMetrics?.length || 1
      },
      status: 200
    });

  } catch (error) {
    console.error('Financial analysis API error:', error);
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