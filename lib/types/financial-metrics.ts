// 財務指標の型定義
export interface FinancialMetrics {
  // 基本情報
  company_id: string;
  company_name: string;
  fiscal_year: string;
  document_id: string;
  
  // 損益計算書（P/L）
  revenue?: number;                    // 売上高
  operating_profit?: number;           // 営業利益
  ordinary_profit?: number;            // 経常利益
  net_income?: number;                // 当期純利益
  gross_profit?: number;              // 売上総利益
  cost_of_sales?: number;             // 売上原価
  
  // 貸借対照表（B/S）
  total_assets?: number;              // 総資産
  total_liabilities?: number;         // 総負債
  net_assets?: number;                // 純資産
  current_assets?: number;            // 流動資産
  fixed_assets?: number;              // 固定資産
  current_liabilities?: number;       // 流動負債
  long_term_liabilities?: number;     // 固定負債
  
  // キャッシュフロー計算書（C/F）
  operating_cash_flow?: number;       // 営業キャッシュフロー
  investing_cash_flow?: number;       // 投資キャッシュフロー
  financing_cash_flow?: number;       // 財務キャッシュフロー
  free_cash_flow?: number;            // フリーキャッシュフロー
  
  // 株式関連
  shares_outstanding?: number;        // 発行済株式数
  earnings_per_share?: number;        // 1株当たり利益
  book_value_per_share?: number;      // 1株当たり純資産
  dividends_per_share?: number;       // 1株当たり配当
  
  // 財務比率
  roe?: number;                       // 自己資本利益率
  roa?: number;                       // 総資産利益率
  current_ratio?: number;             // 流動比率
  debt_to_equity_ratio?: number;      // 負債資本比率
  operating_margin?: number;          // 営業利益率
  net_margin?: number;                // 純利益率
  
  // その他
  employees?: number;                 // 従業員数
  average_salary?: number;            // 平均年間給与
  
  // メタデータ
  extracted_at: string;               // 抽出日時
  confidence_score?: number;          // 抽出信頼度
  source_sections: string[];          // 抽出元セクション
  extraction_method: 'pattern' | 'table' | 'manual';
}

// 財務指標抽出結果
export interface FinancialExtractionResult {
  success: boolean;
  metrics?: FinancialMetrics;
  errors?: string[];
  warnings?: string[];
  raw_data?: any;
}

// 時系列データ
export interface FinancialTimeSeries {
  company_id: string;
  company_name: string;
  metrics: FinancialMetrics[];
  years: string[];
  trends: {
    [key: string]: {
      value_change: number;
      percentage_change: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
  };
}

// 比較分析結果
export interface CompanyComparison {
  companies: {
    company_id: string;
    company_name: string;
    metrics: FinancialMetrics;
  }[];
  industry_average?: FinancialMetrics;
  rankings: {
    [key: string]: {
      company_id: string;
      value: number;
      rank: number;
    }[];
  };
}

// 財務分析レポート
export interface FinancialAnalysisReport {
  company_id: string;
  company_name: string;
  fiscal_year: string;
  
  // 財務健全性
  financial_health: {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: {
      liquidity: number;
      profitability: number;
      efficiency: number;
      leverage: number;
    };
  };
  
  // 成長性分析
  growth_analysis: {
    revenue_growth: number;
    profit_growth: number;
    asset_growth: number;
    growth_stage: 'high_growth' | 'stable_growth' | 'mature' | 'declining';
  };
  
  // リスク評価
  risk_assessment: {
    financial_risk: 'low' | 'medium' | 'high';
    business_risk: 'low' | 'medium' | 'high';
    market_risk: 'low' | 'medium' | 'high';
    overall_risk: 'low' | 'medium' | 'high';
  };
  
  // 推奨事項
  recommendations: string[];
  
  generated_at: string;
}