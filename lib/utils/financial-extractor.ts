import { FinancialMetrics, FinancialExtractionResult } from '@/lib/types/financial-metrics';

// 日本語の数値表現を数値に変換
function parseJapaneseNumber(text: string): number | null {
  if (!text) return null;
  
  // カンマと全角数字を半角に変換
  const normalized = text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/,/g, '')
    .replace(/，/g, '');
  
  // 単位を考慮した変換
  const unitMultipliers: { [key: string]: number } = {
    '千円': 1000,
    '百万円': 1000000,
    '十億円': 1000000000,
    '億円': 100000000,
    '万円': 10000,
    '円': 1
  };
  
  for (const [unit, multiplier] of Object.entries(unitMultipliers)) {
    if (normalized.includes(unit)) {
      const numberPart = normalized.replace(unit, '').trim();
      const number = parseFloat(numberPart);
      if (!isNaN(number)) {
        return number * multiplier;
      }
    }
  }
  
  // 通常の数値として解析
  const number = parseFloat(normalized);
  return isNaN(number) ? null : number;
}

// テーブルデータを解析
function parseTableData(content: string): any[] {
  const tables: any[] = [];
  const lines = content.split('\n');
  
  let inTable = false;
  let currentTable: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // テーブルの開始を検出
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(trimmed);
    } else if (inTable && trimmed === '') {
      // テーブルの終了
      if (currentTable.length > 0) {
        tables.push(parseMarkdownTable(currentTable.join('\n')));
        currentTable = [];
      }
      inTable = false;
    }
  }
  
  // 最後のテーブルを処理
  if (currentTable.length > 0) {
    tables.push(parseMarkdownTable(currentTable.join('\n')));
  }
  
  return tables;
}

// Markdownテーブルを解析
function parseMarkdownTable(tableText: string): any {
  const lines = tableText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;
  
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
  const data: any[] = [];
  
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || '';
      });
      data.push(row);
    }
  }
  
  return {
    headers,
    data,
    raw: tableText
  };
}

// パターンマッチングで財務指標を抽出
function extractFinancialMetricsFromPatterns(content: string, companyInfo: any): Partial<FinancialMetrics> {
  const metrics: Partial<FinancialMetrics> = {};
  const patterns = {
    // 損益計算書
    revenue: [
      /売上高[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /営業収益[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /総収益[\s\S]*?([0-9,]+)[\s]*?百万円/g
    ],
    operating_profit: [
      /営業利益[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /営業利益.*?([0-9,]+)/g
    ],
    ordinary_profit: [
      /経常利益[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /経常利益.*?([0-9,]+)/g
    ],
    net_income: [
      /当期純利益[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /親会社株主に帰属する当期純利益[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /当期純利益.*?([0-9,]+)/g
    ],
    
    // 貸借対照表
    total_assets: [
      /総資産[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /資産合計[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /資産の部合計[\s\S]*?([0-9,]+)[\s]*?百万円/g
    ],
    total_liabilities: [
      /負債合計[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /負債の部合計[\s\S]*?([0-9,]+)[\s]*?百万円/g
    ],
    net_assets: [
      /純資産合計[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /純資産の部合計[\s\S]*?([0-9,]+)[\s]*?百万円/g,
      /株主資本合計[\s\S]*?([0-9,]+)[\s]*?百万円/g
    ],
    
    // その他
    employees: [
      /従業員数[\s\S]*?([0-9,]+)[\s]*?人/g,
      /従業員[\s\S]*?([0-9,]+)[\s]*?名/g
    ],
    average_salary: [
      /平均年間給与[\s\S]*?([0-9,]+)[\s]*?円/g,
      /平均給与[\s\S]*?([0-9,]+)[\s]*?円/g
    ]
  };
  
  for (const [key, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        const value = parseJapaneseNumber(matches[0][1]);
        if (value !== null) {
          (metrics as any)[key] = value;
          break;
        }
      }
    }
  }
  
  return metrics;
}

// テーブルから財務指標を抽出
function extractFinancialMetricsFromTables(tables: any[], companyInfo: any): Partial<FinancialMetrics> {
  const metrics: Partial<FinancialMetrics> = {};
  
  for (const table of tables) {
    if (!table || !table.data) continue;
    
    for (const row of table.data) {
      const keys = Object.keys(row);
      const firstKey = keys[0];
      
      if (!firstKey) continue;
      
      const label = firstKey.toLowerCase();
      
      // 売上高の抽出
      if (label.includes('売上高') || label.includes('営業収益')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null && value > 0) {
            metrics.revenue = value;
            break;
          }
        }
      }
      
      // 営業利益の抽出
      if (label.includes('営業利益')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null) {
            metrics.operating_profit = value;
            break;
          }
        }
      }
      
      // 経常利益の抽出
      if (label.includes('経常利益')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null) {
            metrics.ordinary_profit = value;
            break;
          }
        }
      }
      
      // 当期純利益の抽出
      if (label.includes('当期純利益') || label.includes('親会社株主に帰属する当期純利益')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null) {
            metrics.net_income = value;
            break;
          }
        }
      }
      
      // 総資産の抽出
      if (label.includes('総資産') || label.includes('資産合計')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null && value > 0) {
            metrics.total_assets = value;
            break;
          }
        }
      }
      
      // 純資産の抽出
      if (label.includes('純資産') || label.includes('株主資本合計')) {
        for (let i = 1; i < keys.length; i++) {
          const value = parseJapaneseNumber(row[keys[i]]);
          if (value !== null && value > 0) {
            metrics.net_assets = value;
            break;
          }
        }
      }
    }
  }
  
  return metrics;
}

// 財務比率を計算
function calculateFinancialRatios(metrics: Partial<FinancialMetrics>): Partial<FinancialMetrics> {
  const calculated = { ...metrics };
  
  // ROE（自己資本利益率）= 当期純利益 / 純資産 × 100
  if (metrics.net_income && metrics.net_assets && metrics.net_assets > 0) {
    calculated.roe = (metrics.net_income / metrics.net_assets) * 100;
  }
  
  // ROA（総資産利益率）= 当期純利益 / 総資産 × 100
  if (metrics.net_income && metrics.total_assets && metrics.total_assets > 0) {
    calculated.roa = (metrics.net_income / metrics.total_assets) * 100;
  }
  
  // 営業利益率 = 営業利益 / 売上高 × 100
  if (metrics.operating_profit && metrics.revenue && metrics.revenue > 0) {
    calculated.operating_margin = (metrics.operating_profit / metrics.revenue) * 100;
  }
  
  // 純利益率 = 当期純利益 / 売上高 × 100
  if (metrics.net_income && metrics.revenue && metrics.revenue > 0) {
    calculated.net_margin = (metrics.net_income / metrics.revenue) * 100;
  }
  
  // 負債資本比率 = 総負債 / 純資産 × 100
  if (metrics.total_liabilities && metrics.net_assets && metrics.net_assets > 0) {
    calculated.debt_to_equity_ratio = (metrics.total_liabilities / metrics.net_assets) * 100;
  }
  
  // 流動比率 = 流動資産 / 流動負債 × 100
  if (metrics.current_assets && metrics.current_liabilities && metrics.current_liabilities > 0) {
    calculated.current_ratio = (metrics.current_assets / metrics.current_liabilities) * 100;
  }
  
  return calculated;
}

// メイン抽出関数
export function extractFinancialMetrics(
  content: string, 
  companyInfo: { company_id: string; company_name: string; fiscal_year: string; document_id: string }
): FinancialExtractionResult {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('コンテンツが空です');
      return { success: false, errors };
    }
    
    // テーブルデータを解析
    const tables = parseTableData(content);
    
    // パターンマッチングで抽出
    const patternMetrics = extractFinancialMetricsFromPatterns(content, companyInfo);
    
    // テーブルから抽出
    const tableMetrics = extractFinancialMetricsFromTables(tables, companyInfo);
    
    // 結果をマージ（テーブルデータを優先）
    const combinedMetrics = { ...patternMetrics, ...tableMetrics };
    
    // 財務比率を計算
    const finalMetrics = calculateFinancialRatios(combinedMetrics);
    
    // 信頼度スコアを計算
    const extractedFields = Object.keys(finalMetrics).filter(key => 
      key !== 'company_id' && key !== 'company_name' && 
      key !== 'fiscal_year' && key !== 'document_id' &&
      finalMetrics[key as keyof FinancialMetrics] !== null &&
      finalMetrics[key as keyof FinancialMetrics] !== undefined
    );
    
    const confidence_score = Math.min(100, (extractedFields.length / 10) * 100); // 10フィールドで100%
    
    if (extractedFields.length === 0) {
      warnings.push('財務指標を抽出できませんでした');
    }
    
    const metrics: FinancialMetrics = {
      ...finalMetrics,
      company_id: companyInfo.company_id,
      company_name: companyInfo.company_name,
      fiscal_year: companyInfo.fiscal_year,
      document_id: companyInfo.document_id,
      extracted_at: new Date().toISOString(),
      confidence_score,
      source_sections: ['財務諸表', '損益計算書', '貸借対照表'],
      extraction_method: tables.length > 0 ? 'table' : 'pattern'
    } as FinancialMetrics;
    
    return {
      success: true,
      metrics,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      raw_data: { tables, pattern_matches: patternMetrics, table_matches: tableMetrics }
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [`抽出エラー: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// 複数年度の比較分析
export function analyzeFinancialTrends(metricsArray: FinancialMetrics[]) {
  if (metricsArray.length < 2) {
    return null;
  }
  
  const sortedMetrics = metricsArray.sort((a, b) => a.fiscal_year.localeCompare(b.fiscal_year));
  const trends: any = {};
  
  const fields = ['revenue', 'operating_profit', 'ordinary_profit', 'net_income', 'total_assets', 'net_assets'];
  
  for (const field of fields) {
    const values = sortedMetrics.map(m => (m as any)[field]).filter(v => v !== null && v !== undefined);
    
    if (values.length >= 2) {
      const oldValue = values[0];
      const newValue = values[values.length - 1];
      
      const valueChange = newValue - oldValue;
      const percentageChange = oldValue > 0 ? (valueChange / oldValue) * 100 : 0;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(percentageChange) > 5) {
        trend = percentageChange > 0 ? 'increasing' : 'decreasing';
      }
      
      trends[field] = {
        value_change: valueChange,
        percentage_change: percentageChange,
        trend
      };
    }
  }
  
  return trends;
}