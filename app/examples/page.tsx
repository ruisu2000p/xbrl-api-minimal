'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExamplesPage() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const examples = {
    'financial-analysis': {
      title: '財務分析ダッシュボード',
      description: '複数企業の財務データを取得し、比較分析するダッシュボードの実装例',
      tags: ['財務分析', 'データ可視化', 'React'],
      difficulty: '中級',
      languages: {
        javascript: `// 財務分析ダッシュボードの実装例
import { XBRLClient } from '@xbrl-jp/sdk';
import { Chart } from 'chart.js';

class FinancialDashboard {
  constructor(apiKey) {
    this.client = new XBRLClient({ apiKey });
    this.companies = ['S100LO6W', 'S100JKGG', 'S100H1VG']; // トヨタ、ソニー、ホンダ
  }

  async fetchFinancialData() {
    const promises = this.companies.map(async (companyId) => {
      const [company, financial] = await Promise.all([
        this.client.companies.get(companyId),
        this.client.financial.get({ companyId, year: 2023 })
      ]);
      
      return {
        ...company.data,
        financial: financial.data
      };
    });
    
    return Promise.all(promises);
  }

  calculateMetrics(data) {
    return data.map(company => ({
      name: company.name,
      revenue: company.financial.revenue,
      profit: company.financial.net_income,
      profitMargin: (company.financial.net_income / company.financial.revenue * 100).toFixed(2),
      roe: (company.financial.roe * 100).toFixed(2),
      roa: (company.financial.roa * 100).toFixed(2)
    }));
  }

  renderChart(metrics) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: metrics.map(m => m.name),
        datasets: [{
          label: '売上高（億円）',
          data: metrics.map(m => m.revenue / 100000000),
          backgroundColor: 'rgba(59, 130, 246, 0.5)'
        }]
      }
    });
  }

  async init() {
    try {
      const data = await this.fetchFinancialData();
      const metrics = this.calculateMetrics(data);
      this.renderChart(metrics);
      console.log('財務メトリクス:', metrics);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  }
}

// 使用例
const dashboard = new FinancialDashboard('YOUR_API_KEY');
dashboard.init();`,
        python: `# 財務分析ダッシュボードの実装例
import pandas as pd
import matplotlib.pyplot as plt
from xbrl_jp import XBRLClient

class FinancialDashboard:
    def __init__(self, api_key):
        self.client = XBRLClient(api_key=api_key)
        self.companies = ['S100LO6W', 'S100JKGG', 'S100H1VG']  # トヨタ、ソニー、ホンダ
    
    def fetch_financial_data(self):
        """複数企業の財務データを取得"""
        data = []
        for company_id in self.companies:
            company = self.client.companies.get(company_id)
            financial = self.client.financial.get(
                company_id=company_id,
                year=2023
            )
            data.append({
                'name': company['data']['name'],
                'revenue': financial['data']['revenue'],
                'net_income': financial['data']['net_income'],
                'total_assets': financial['data']['total_assets'],
                'roe': financial['data']['roe'],
                'roa': financial['data']['roa']
            })
        return pd.DataFrame(data)
    
    def calculate_metrics(self, df):
        """財務メトリクスを計算"""
        df['profit_margin'] = (df['net_income'] / df['revenue'] * 100).round(2)
        df['roe_percent'] = (df['roe'] * 100).round(2)
        df['roa_percent'] = (df['roa'] * 100).round(2)
        return df
    
    def plot_comparison(self, df):
        """比較チャートを作成"""
        fig, axes = plt.subplots(2, 2, figsize=(12, 8))
        
        # 売上高比較
        axes[0, 0].bar(df['name'], df['revenue'] / 1e12)
        axes[0, 0].set_title('売上高（兆円）')
        axes[0, 0].set_ylabel('兆円')
        
        # 利益率比較
        axes[0, 1].bar(df['name'], df['profit_margin'])
        axes[0, 1].set_title('利益率（％）')
        axes[0, 1].set_ylabel('%')
        
        # ROE比較
        axes[1, 0].bar(df['name'], df['roe_percent'])
        axes[1, 0].set_title('ROE（％）')
        axes[1, 0].set_ylabel('%')
        
        # ROA比較
        axes[1, 1].bar(df['name'], df['roa_percent'])
        axes[1, 1].set_title('ROA（％）')
        axes[1, 1].set_ylabel('%')
        
        plt.tight_layout()
        plt.show()
    
    def run(self):
        """ダッシュボードを実行"""
        df = self.fetch_financial_data()
        df = self.calculate_metrics(df)
        print(df[['name', 'profit_margin', 'roe_percent', 'roa_percent']])
        self.plot_comparison(df)

# 使用例
dashboard = FinancialDashboard('YOUR_API_KEY')
dashboard.run()`
      }
    },
    'time-series': {
      title: '時系列分析',
      description: '企業の財務データを時系列で取得し、トレンドを分析',
      tags: ['時系列', 'トレンド分析', 'データサイエンス'],
      difficulty: '上級',
      languages: {
        javascript: `// 時系列財務データ分析
import { XBRLClient } from '@xbrl-jp/sdk';

class TimeSeriesAnalyzer {
  constructor(apiKey) {
    this.client = new XBRLClient({ apiKey });
  }

  async fetchHistoricalData(companyId, startYear, endYear) {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    
    const promises = years.map(year => 
      this.client.financial.get({ companyId, year })
        .catch(() => null) // データが存在しない年はnull
    );
    
    const results = await Promise.all(promises);
    return results
      .filter(r => r !== null)
      .map(r => r.data);
  }

  calculateGrowthRate(data) {
    const sorted = data.sort((a, b) => a.year - b.year);
    const growthRates = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      growthRates.push({
        year: curr.year,
        revenueGrowth: ((curr.revenue - prev.revenue) / prev.revenue * 100).toFixed(2),
        profitGrowth: ((curr.net_income - prev.net_income) / prev.net_income * 100).toFixed(2),
        assetGrowth: ((curr.total_assets - prev.total_assets) / prev.total_assets * 100).toFixed(2)
      });
    }
    
    return growthRates;
  }

  calculateMovingAverage(data, window = 3) {
    const sorted = data.sort((a, b) => a.year - b.year);
    const movingAverages = [];
    
    for (let i = window - 1; i < sorted.length; i++) {
      const subset = sorted.slice(i - window + 1, i + 1);
      const avgRevenue = subset.reduce((sum, d) => sum + d.revenue, 0) / window;
      const avgProfit = subset.reduce((sum, d) => sum + d.net_income, 0) / window;
      
      movingAverages.push({
        year: sorted[i].year,
        maRevenue: avgRevenue,
        maProfit: avgProfit,
        actualRevenue: sorted[i].revenue,
        actualProfit: sorted[i].net_income
      });
    }
    
    return movingAverages;
  }

  detectTrend(growthRates) {
    const revenueGrowths = growthRates.map(g => parseFloat(g.revenueGrowth));
    const avgGrowth = revenueGrowths.reduce((a, b) => a + b, 0) / revenueGrowths.length;
    
    // 簡単なトレンド判定
    if (avgGrowth > 5) return '成長トレンド';
    if (avgGrowth < -5) return '下降トレンド';
    return '横ばい';
  }

  async analyze(companyId, startYear = 2019, endYear = 2023) {
    const historicalData = await this.fetchHistoricalData(companyId, startYear, endYear);
    const growthRates = this.calculateGrowthRate(historicalData);
    const movingAverages = this.calculateMovingAverage(historicalData);
    const trend = this.detectTrend(growthRates);
    
    return {
      historicalData,
      growthRates,
      movingAverages,
      trend,
      summary: {
        averageRevenueGrowth: (growthRates.reduce((sum, g) => sum + parseFloat(g.revenueGrowth), 0) / growthRates.length).toFixed(2),
        averageProfitGrowth: (growthRates.reduce((sum, g) => sum + parseFloat(g.profitGrowth), 0) / growthRates.length).toFixed(2),
        trend
      }
    };
  }
}

// 使用例
const analyzer = new TimeSeriesAnalyzer('YOUR_API_KEY');
analyzer.analyze('S100LO6W').then(results => {
  console.log('トレンド:', results.trend);
  console.log('成長率:', results.growthRates);
  console.log('サマリー:', results.summary);
});`,
        python: `# 時系列財務データ分析
import numpy as np
import pandas as pd
from scipy import stats
from xbrl_jp import XBRLClient
import matplotlib.pyplot as plt

class TimeSeriesAnalyzer:
    def __init__(self, api_key):
        self.client = XBRLClient(api_key=api_key)
    
    def fetch_historical_data(self, company_id, start_year=2019, end_year=2023):
        """複数年の財務データを取得"""
        data = []
        for year in range(start_year, end_year + 1):
            try:
                financial = self.client.financial.get(
                    company_id=company_id,
                    year=year
                )
                data.append(financial['data'])
            except:
                continue  # データが存在しない年はスキップ
        
        return pd.DataFrame(data)
    
    def calculate_growth_rates(self, df):
        """成長率を計算"""
        df = df.sort_values('year')
        df['revenue_growth'] = df['revenue'].pct_change() * 100
        df['profit_growth'] = df['net_income'].pct_change() * 100
        df['asset_growth'] = df['total_assets'].pct_change() * 100
        return df
    
    def calculate_moving_average(self, df, window=3):
        """移動平均を計算"""
        df = df.sort_values('year')
        df[f'revenue_ma{window}'] = df['revenue'].rolling(window=window).mean()
        df[f'profit_ma{window}'] = df['net_income'].rolling(window=window).mean()
        return df
    
    def detect_trend(self, df):
        """トレンドを検出（線形回帰）"""
        x = np.arange(len(df))
        y = df['revenue'].values
        
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        # トレンド判定
        if slope > 0 and p_value < 0.05:
            trend = '上昇トレンド'
        elif slope < 0 and p_value < 0.05:
            trend = '下降トレンド'
        else:
            trend = '横ばい'
        
        return {
            'trend': trend,
            'slope': slope,
            'r_squared': r_value ** 2,
            'p_value': p_value
        }
    
    def forecast_next_year(self, df):
        """次年度を予測（単純な線形外挿）"""
        x = np.arange(len(df))
        y = df['revenue'].values
        
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        next_year = df['year'].max() + 1
        next_revenue = p(len(df))
        
        return {
            'year': next_year,
            'predicted_revenue': next_revenue,
            'confidence': 'Low'  # 簡単な予測のため信頼度は低
        }
    
    def plot_analysis(self, df):
        """分析結果をプロット"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 売上高の推移
        axes[0, 0].plot(df['year'], df['revenue'] / 1e12, marker='o')
        axes[0, 0].set_title('売上高の推移')
        axes[0, 0].set_xlabel('年')
        axes[0, 0].set_ylabel('売上高（兆円）')
        axes[0, 0].grid(True)
        
        # 成長率の推移
        axes[0, 1].bar(df['year'][1:], df['revenue_growth'][1:])
        axes[0, 1].set_title('売上高成長率')
        axes[0, 1].set_xlabel('年')
        axes[0, 1].set_ylabel('成長率（％）')
        axes[0, 1].axhline(y=0, color='r', linestyle='-', linewidth=0.5)
        axes[0, 1].grid(True)
        
        # 利益率の推移
        df['profit_margin'] = df['net_income'] / df['revenue'] * 100
        axes[1, 0].plot(df['year'], df['profit_margin'], marker='s', color='green')
        axes[1, 0].set_title('利益率の推移')
        axes[1, 0].set_xlabel('年')
        axes[1, 0].set_ylabel('利益率（％）')
        axes[1, 0].grid(True)
        
        # ROEとROAの推移
        axes[1, 1].plot(df['year'], df['roe'] * 100, marker='o', label='ROE')
        axes[1, 1].plot(df['year'], df['roa'] * 100, marker='s', label='ROA')
        axes[1, 1].set_title('ROE・ROAの推移')
        axes[1, 1].set_xlabel('年')
        axes[1, 1].set_ylabel('％')
        axes[1, 1].legend()
        axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.show()
    
    def analyze(self, company_id):
        """総合分析を実行"""
        df = self.fetch_historical_data(company_id)
        df = self.calculate_growth_rates(df)
        df = self.calculate_moving_average(df)
        
        trend_analysis = self.detect_trend(df)
        forecast = self.forecast_next_year(df)
        
        print(f"\\n=== 時系列分析結果 ===")
        print(f"トレンド: {trend_analysis['trend']}")
        print(f"R²値: {trend_analysis['r_squared']:.3f}")
        print(f"\\n平均成長率:")
        print(f"  売上高: {df['revenue_growth'].mean():.2f}%")
        print(f"  純利益: {df['profit_growth'].mean():.2f}%")
        print(f"\\n{forecast['year']}年予測:")
        print(f"  売上高: {forecast['predicted_revenue']/1e12:.2f}兆円")
        
        self.plot_analysis(df)
        return df

# 使用例
analyzer = TimeSeriesAnalyzer('YOUR_API_KEY')
results = analyzer.analyze('S100LO6W')`
      }
    },
    'batch-processing': {
      title: 'バッチ処理',
      description: '大量のデータを効率的に処理するバッチ処理の実装例',
      tags: ['バッチ処理', 'パフォーマンス', '並列処理'],
      difficulty: '上級',
      languages: {
        javascript: `// 大量データのバッチ処理実装
import { XBRLClient } from '@xbrl-jp/sdk';

class BatchProcessor {
  constructor(apiKey, options = {}) {
    this.client = new XBRLClient({ apiKey });
    this.batchSize = options.batchSize || 10;
    this.concurrency = options.concurrency || 5;
    this.retryLimit = options.retryLimit || 3;
    this.results = [];
    this.errors = [];
  }

  async processInBatches(items, processFn) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    
    console.log(\`Processing \${items.length} items in \${batches.length} batches\`);
    
    for (const [index, batch] of batches.entries()) {
      console.log(\`Processing batch \${index + 1}/\${batches.length}\`);
      await this.processBatch(batch, processFn);
      
      // レート制限を考慮した待機
      if (index < batches.length - 1) {
        await this.sleep(1000);
      }
    }
    
    return {
      success: this.results,
      errors: this.errors,
      summary: {
        total: items.length,
        successful: this.results.length,
        failed: this.errors.length
      }
    };
  }

  async processBatch(batch, processFn) {
    const promises = batch.map(item => 
      this.processWithRetry(item, processFn)
    );
    
    // 並列実行数を制限
    const results = await this.limitConcurrency(promises, this.concurrency);
    results.forEach(result => {
      if (result.success) {
        this.results.push(result.data);
      } else {
        this.errors.push(result.error);
      }
    });
  }

  async processWithRetry(item, processFn, attempt = 1) {
    try {
      const data = await processFn(item);
      return { success: true, data };
    } catch (error) {
      if (attempt < this.retryLimit) {
        console.log(\`Retry \${attempt}/\${this.retryLimit} for item \${item.id || item}\`);
        await this.sleep(1000 * attempt); // エクスポネンシャルバックオフ
        return this.processWithRetry(item, processFn, attempt + 1);
      }
      return { 
        success: false, 
        error: { item, error: error.message, attempts: attempt }
      };
    }
  }

  async limitConcurrency(promises, limit) {
    const results = [];
    const executing = [];
    
    for (const promise of promises) {
      const p = Promise.resolve().then(() => promise);
      results.push(p);
      
      if (promises.length >= limit) {
        executing.push(p);
        
        if (executing.length >= limit) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(e => e === p), 1);
        }
      }
    }
    
    return Promise.all(results);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用例: 全企業の最新財務データを取得
async function fetchAllCompaniesFinancialData() {
  const processor = new BatchProcessor('YOUR_API_KEY', {
    batchSize: 20,
    concurrency: 5,
    retryLimit: 3
  });
  
  // まず企業一覧を取得
  const client = new XBRLClient({ apiKey: 'YOUR_API_KEY' });
  const companies = await client.companies.list({ limit: 1000 });
  
  // 各企業の財務データを取得する関数
  const fetchFinancial = async (company) => {
    const financial = await client.financial.get({
      companyId: company.company_id,
      year: 2023
    });
    return {
      companyId: company.company_id,
      name: company.name,
      financial: financial.data
    };
  };
  
  // バッチ処理実行
  const results = await processor.processInBatches(
    companies.data,
    fetchFinancial
  );
  
  console.log('処理完了:', results.summary);
  
  // 結果をCSVとして出力
  const csv = results.success.map(r => 
    \`\${r.name},\${r.financial.revenue},\${r.financial.net_income}\`
  ).join('\\n');
  
  return csv;
}

fetchAllCompaniesFinancialData().then(csv => {
  console.log('CSV生成完了');
  // ファイルに保存など
});`,
        python: `# 大量データのバッチ処理実装
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
from typing import List, Dict, Callable, Any
import time
from xbrl_jp import XBRLClient

class BatchProcessor:
    def __init__(self, api_key: str, batch_size: int = 10, 
                 max_workers: int = 5, retry_limit: int = 3):
        self.client = XBRLClient(api_key=api_key)
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.retry_limit = retry_limit
        self.results = []
        self.errors = []
    
    def process_in_batches(self, items: List[Any], 
                          process_fn: Callable) -> Dict:
        """バッチ処理を実行"""
        batches = [items[i:i + self.batch_size] 
                  for i in range(0, len(items), self.batch_size)]
        
        print(f"Processing {len(items)} items in {len(batches)} batches")
        
        for i, batch in enumerate(batches, 1):
            print(f"Processing batch {i}/{len(batches)}")
            self._process_batch(batch, process_fn)
            
            # レート制限対策
            if i < len(batches):
                time.sleep(1)
        
        return {
            'success': self.results,
            'errors': self.errors,
            'summary': {
                'total': len(items),
                'successful': len(self.results),
                'failed': len(self.errors)
            }
        }
    
    def _process_batch(self, batch: List[Any], process_fn: Callable):
        """バッチを並列処理"""
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            for item in batch:
                future = executor.submit(self._process_with_retry, 
                                       item, process_fn)
                futures.append(future)
            
            for future in futures:
                result = future.result()
                if result['success']:
                    self.results.append(result['data'])
                else:
                    self.errors.append(result['error'])
    
    def _process_with_retry(self, item: Any, process_fn: Callable, 
                           attempt: int = 1) -> Dict:
        """リトライ機能付き処理"""
        try:
            data = process_fn(item)
            return {'success': True, 'data': data}
        except Exception as e:
            if attempt < self.retry_limit:
                print(f"Retry {attempt}/{self.retry_limit} for {item}")
                time.sleep(attempt)  # エクスポネンシャルバックオフ
                return self._process_with_retry(item, process_fn, 
                                              attempt + 1)
            return {
                'success': False,
                'error': {
                    'item': item,
                    'error': str(e),
                    'attempts': attempt
                }
            }

class AsyncBatchProcessor:
    """非同期バッチ処理（より高速）"""
    
    def __init__(self, api_key: str, batch_size: int = 20, 
                 concurrency: int = 10):
        self.api_key = api_key
        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(concurrency)
        self.base_url = "https://api.xbrl.jp/v1"
    
    async def fetch_with_retry(self, session: aiohttp.ClientSession, 
                               url: str, retries: int = 3) -> Dict:
        """非同期でAPIを呼び出し"""
        async with self.semaphore:
            for attempt in range(retries):
                try:
                    headers = {'X-API-Key': self.api_key}
                    async with session.get(url, headers=headers) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 429:  # Rate limit
                            await asyncio.sleep(2 ** attempt)
                            continue
                        else:
                            raise Exception(f"HTTP {response.status}")
                except Exception as e:
                    if attempt == retries - 1:
                        raise e
                    await asyncio.sleep(2 ** attempt)
    
    async def process_all_companies(self, year: int = 2023):
        """全企業の財務データを非同期で取得"""
        async with aiohttp.ClientSession() as session:
            # 企業一覧を取得
            companies_url = f"{self.base_url}/companies?limit=1000"
            companies_data = await self.fetch_with_retry(session, companies_url)
            companies = companies_data['data']
            
            # 財務データを並列取得
            tasks = []
            for company in companies:
                url = f"{self.base_url}/financial?company_id={company['company_id']}&year={year}"
                task = self.fetch_financial_with_company(session, company, url)
                tasks.append(task)
            
            # バッチごとに処理
            results = []
            for i in range(0, len(tasks), self.batch_size):
                batch = tasks[i:i + self.batch_size]
                batch_results = await asyncio.gather(*batch, 
                                                    return_exceptions=True)
                results.extend(batch_results)
                
                # レート制限対策
                if i + self.batch_size < len(tasks):
                    await asyncio.sleep(1)
            
            # エラーと成功を分離
            successes = [r for r in results if not isinstance(r, Exception)]
            errors = [r for r in results if isinstance(r, Exception)]
            
            return {
                'successes': successes,
                'errors': errors,
                'summary': {
                    'total': len(companies),
                    'successful': len(successes),
                    'failed': len(errors)
                }
            }
    
    async def fetch_financial_with_company(self, session, company, url):
        """企業情報と財務データを結合"""
        financial = await self.fetch_with_retry(session, url)
        return {
            'company_id': company['company_id'],
            'name': company['name'],
            'sector': company['sector'],
            'financial': financial['data']
        }

# 使用例1: 同期バッチ処理
def sync_batch_example():
    processor = BatchProcessor('YOUR_API_KEY', batch_size=20)
    client = processor.client
    
    # 企業一覧を取得
    companies = client.companies.list(limit=100)
    
    # 処理関数
    def fetch_financial(company):
        return client.financial.get(
            company_id=company['company_id'],
            year=2023
        )
    
    # バッチ処理実行
    results = processor.process_in_batches(companies['data'], fetch_financial)
    
    # 結果をDataFrameに変換
    df = pd.DataFrame(results['success'])
    df.to_csv('financial_data.csv', index=False)
    
    print(f"処理完了: {results['summary']}")
    return df

# 使用例2: 非同期バッチ処理
async def async_batch_example():
    processor = AsyncBatchProcessor('YOUR_API_KEY', 
                                   batch_size=50, 
                                   concurrency=20)
    
    results = await processor.process_all_companies(2023)
    
    # 結果をDataFrameに変換
    df = pd.DataFrame(results['successes'])
    
    # 財務指標を計算
    df['profit_margin'] = (df['financial'].apply(lambda x: x['net_income']) / 
                          df['financial'].apply(lambda x: x['revenue']) * 100)
    
    # 上位10社を表示
    top_companies = df.nlargest(10, 'profit_margin')[['name', 'profit_margin']]
    print("利益率トップ10:")
    print(top_companies)
    
    return df

# 実行
if __name__ == "__main__":
    # 同期処理
    df_sync = sync_batch_example()
    
    # 非同期処理
    df_async = asyncio.run(async_batch_example())
    
    print(f"同期処理: {len(df_sync)}件")
    print(f"非同期処理: {len(df_async)}件")`
      }
    },
    'webhook-integration': {
      title: 'Webhook統合',
      description: 'Webhookを使用してリアルタイムでデータ更新を受け取る実装例',
      tags: ['Webhook', 'リアルタイム', 'イベント駆動'],
      difficulty: '中級',
      languages: {
        javascript: `// Webhook統合の実装例（Express.js）
const express = require('express');
const crypto = require('crypto');
const { XBRLClient } = require('@xbrl-jp/sdk');

class WebhookServer {
  constructor(apiKey, webhookSecret) {
    this.app = express();
    this.client = new XBRLClient({ apiKey });
    this.webhookSecret = webhookSecret;
    this.eventHandlers = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Raw bodyを保存（署名検証用）
    this.app.use(express.raw({ 
      type: 'application/json',
      verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf-8');
      }
    }));
  }

  setupRoutes() {
    this.app.post('/webhook', (req, res) => {
      try {
        // 署名を検証
        if (!this.verifySignature(req)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const event = JSON.parse(req.rawBody);
        console.log(\`Received event: \${event.type}\`);
        
        // イベントを処理
        this.handleEvent(event);
        
        // 即座に200を返す（処理は非同期で行う）
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Invalid request' });
      }
    });
    
    // Webhook設定エンドポイント
    this.app.post('/webhook/register', async (req, res) => {
      try {
        const { events, url } = req.body;
        
        // APIでWebhookを登録（実際のAPIに合わせて調整）
        const webhook = await this.client.webhooks.create({
          url,
          events,
          secret: this.webhookSecret
        });
        
        res.json({ webhook });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  verifySignature(req) {
    const signature = req.headers['x-webhook-signature'];
    if (!signature) return false;
    
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(req.rawBody)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    );
  }

  handleEvent(event) {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      // 非同期でハンドラーを実行
      setImmediate(() => {
        handler(event).catch(error => {
          console.error(\`Error handling \${event.type}:\`, error);
        });
      });
    }
  }

  // イベントハンドラーを登録
  on(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(\`Webhook server listening on port \${port}\`);
    });
  }
}

// 使用例
const server = new WebhookServer('YOUR_API_KEY', 'YOUR_WEBHOOK_SECRET');

// イベントハンドラーを定義
server.on('document.updated', async (event) => {
  console.log('Document updated:', event.data);
  
  // 更新されたドキュメントを取得
  const document = await server.client.documents.get({
    companyId: event.data.company_id,
    year: event.data.year,
    section: event.data.section
  });
  
  // データベースを更新、通知を送信など
  await updateDatabase(document);
  await sendNotification(event.data.company_name);
});

server.on('financial.published', async (event) => {
  console.log('New financial data:', event.data);
  
  // 財務データを取得して分析
  const financial = await server.client.financial.get({
    companyId: event.data.company_id,
    year: event.data.year
  });
  
  // 自動分析を実行
  const analysis = await analyzeFinancialData(financial);
  
  // レポートを生成
  await generateReport(analysis);
});

server.on('rate_limit.warning', async (event) => {
  console.warn('Rate limit warning:', event.data);
  
  // アラートを送信
  await sendAlert({
    type: 'RATE_LIMIT_WARNING',
    usage: event.data.current_usage,
    limit: event.data.limit,
    percentage: event.data.percentage
  });
});

// サーバーを起動
server.start(3000);

// ヘルパー関数（実装例）
async function updateDatabase(document) {
  // データベース更新ロジック
  console.log('Updating database with:', document.data.title);
}

async function sendNotification(companyName) {
  // 通知送信ロジック
  console.log(\`Sending notification for \${companyName}\`);
}

async function analyzeFinancialData(financial) {
  // 財務分析ロジック
  return {
    revenue: financial.data.revenue,
    growth: calculateGrowth(financial),
    metrics: calculateMetrics(financial)
  };
}`,
        python: `# Webhook統合の実装例（Flask）
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
from datetime import datetime
from threading import Thread
from xbrl_jp import XBRLClient
import logging

class WebhookServer:
    def __init__(self, api_key, webhook_secret):
        self.app = Flask(__name__)
        self.client = XBRLClient(api_key=api_key)
        self.webhook_secret = webhook_secret
        self.event_handlers = {}
        
        # ロギング設定
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.setup_routes()
    
    def setup_routes(self):
        """Webhookエンドポイントを設定"""
        
        @self.app.route('/webhook', methods=['POST'])
        def webhook_endpoint():
            try:
                # 署名を検証
                if not self.verify_signature(request):
                    return jsonify({'error': 'Invalid signature'}), 401
                
                event = request.get_json()
                self.logger.info(f"Received event: {event['type']}")
                
                # イベントを非同期で処理
                Thread(target=self.handle_event, args=(event,)).start()
                
                # 即座に200を返す
                return jsonify({'received': True}), 200
                
            except Exception as e:
                self.logger.error(f"Webhook error: {e}")
                return jsonify({'error': str(e)}), 400
        
        @self.app.route('/webhook/register', methods=['POST'])
        def register_webhook():
            """Webhookを登録"""
            try:
                data = request.get_json()
                events = data.get('events', [])
                url = data.get('url')
                
                # APIでWebhookを登録
                webhook = self.client.webhooks.create(
                    url=url,
                    events=events,
                    secret=self.webhook_secret
                )
                
                return jsonify({'webhook': webhook}), 200
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/webhook/test', methods=['POST'])
        def test_webhook():
            """Webhookをテスト"""
            # テストイベントを送信
            test_event = {
                'type': 'test',
                'timestamp': datetime.now().isoformat(),
                'data': {'message': 'Test webhook event'}
            }
            
            Thread(target=self.handle_event, args=(test_event,)).start()
            return jsonify({'status': 'Test event sent'}), 200
    
    def verify_signature(self, request):
        """Webhook署名を検証"""
        signature = request.headers.get('X-Webhook-Signature')
        if not signature:
            return False
        
        # HMAC-SHA256で署名を計算
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            request.data,
            hashlib.sha256
        ).hexdigest()
        
        # タイミング攻撃を防ぐため、hmac.compare_digestを使用
        return hmac.compare_digest(signature, expected_signature)
    
    def handle_event(self, event):
        """イベントを処理"""
        event_type = event.get('type')
        handler = self.event_handlers.get(event_type)
        
        if handler:
            try:
                handler(event)
            except Exception as e:
                self.logger.error(f"Error handling {event_type}: {e}")
        else:
            self.logger.warning(f"No handler for event type: {event_type}")
    
    def on(self, event_type, handler):
        """イベントハンドラーを登録"""
        self.event_handlers[event_type] = handler
        self.logger.info(f"Registered handler for {event_type}")
    
    def run(self, host='0.0.0.0', port=3000, debug=False):
        """サーバーを起動"""
        self.logger.info(f"Starting webhook server on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

class EventProcessor:
    """イベント処理クラス"""
    
    def __init__(self, client):
        self.client = client
        self.logger = logging.getLogger(__name__)
    
    async def process_document_update(self, event):
        """ドキュメント更新イベントを処理"""
        data = event['data']
        
        # 更新されたドキュメントを取得
        document = self.client.documents.get(
            company_id=data['company_id'],
            year=data['year'],
            section=data['section']
        )
        
        # 変更内容を分析
        changes = self.analyze_changes(document, data.get('previous_version'))
        
        # データベースを更新
        self.update_database(document, changes)
        
        # 通知を送信
        if changes['significant']:
            self.send_notification(data['company_name'], changes)
        
        self.logger.info(f"Processed document update for {data['company_name']}")
    
    async def process_financial_published(self, event):
        """財務データ公開イベントを処理"""
        data = event['data']
        
        # 財務データを取得
        financial = self.client.financial.get(
            company_id=data['company_id'],
            year=data['year']
        )
        
        # 前年度との比較
        previous_year = self.client.financial.get(
            company_id=data['company_id'],
            year=data['year'] - 1
        )
        
        # 分析を実行
        analysis = self.analyze_financial(financial['data'], 
                                        previous_year['data'])
        
        # アラート条件をチェック
        alerts = self.check_alert_conditions(analysis)
        
        if alerts:
            self.send_alerts(data['company_name'], alerts)
        
        # レポートを生成
        report = self.generate_report(data['company_name'], analysis)
        self.save_report(report)
        
        self.logger.info(f"Processed financial data for {data['company_name']}")
    
    def analyze_changes(self, document, previous):
        """変更内容を分析"""
        if not previous:
            return {'significant': True, 'type': 'new'}
        
        # 簡単な差分検出（実際はより詳細な分析が必要）
        changes = {
            'significant': False,
            'sections_changed': [],
            'content_diff': None
        }
        
        # 変更箇所を特定
        # ...分析ロジック...
        
        return changes
    
    def analyze_financial(self, current, previous):
        """財務データを分析"""
        analysis = {
            'revenue_growth': (current['revenue'] - previous['revenue']) / previous['revenue'] * 100,
            'profit_growth': (current['net_income'] - previous['net_income']) / previous['net_income'] * 100,
            'roe_change': current['roe'] - previous['roe'],
            'roa_change': current['roa'] - previous['roa']
        }
        
        return analysis
    
    def check_alert_conditions(self, analysis):
        """アラート条件をチェック"""
        alerts = []
        
        # 売上高が20%以上減少
        if analysis['revenue_growth'] < -20:
            alerts.append({
                'type': 'REVENUE_DECLINE',
                'severity': 'high',
                'value': analysis['revenue_growth']
            })
        
        # 利益が赤字転換
        if analysis['profit_growth'] < -100:
            alerts.append({
                'type': 'LOSS_CONVERSION',
                'severity': 'critical',
                'value': analysis['profit_growth']
            })
        
        return alerts

# 使用例
if __name__ == '__main__':
    # サーバーを初期化
    server = WebhookServer('YOUR_API_KEY', 'YOUR_WEBHOOK_SECRET')
    processor = EventProcessor(server.client)
    
    # イベントハンドラーを登録
    server.on('document.updated', processor.process_document_update)
    server.on('financial.published', processor.process_financial_published)
    
    server.on('rate_limit.warning', lambda event: 
        server.logger.warning(f"Rate limit: {event['data']['percentage']}%"))
    
    # カスタムイベントハンドラー
    @server.on('company.created')
    def handle_new_company(event):
        company = event['data']
        print(f"New company added: {company['name']}")
        
        # 初期分析を実行
        initial_analysis = analyze_new_company(company)
        save_to_database(initial_analysis)
    
    # サーバーを起動
    server.run(port=3000, debug=True)`
      }
    }
  } as const;

  // 型定義とガード関数
  type ExampleKey = keyof typeof examples;
  
  function isExampleKey(x: string): x is ExampleKey {
    return x in examples;
  }

  const [selectedExample, setSelectedExample] = useState<ExampleKey>('financial-analysis');

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">サンプルコード</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/sdk')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                ← SDK
              </button>
              <button
                onClick={() => router.push('/docs')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                APIドキュメント →
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* サンプル一覧 */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold mb-4">サンプル一覧</h2>
              <div className="space-y-2">
                {Object.entries(examples).map(([key, example]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedExample(key as ExampleKey)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedExample === key
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{example.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      難易度: {example.difficulty}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* サンプルコード表示 */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">
                  {examples[selectedExample].title}
                </h1>
                <p className="text-gray-600 mb-4">
                  {examples[selectedExample].description}
                </p>
                <div className="flex gap-2">
                  {examples[selectedExample].tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    examples[selectedExample].difficulty === '中級'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {examples[selectedExample].difficulty}
                  </span>
                </div>
              </div>

              {/* 言語選択タブ */}
              <div className="border-b mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedLanguage('javascript')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      selectedLanguage === 'javascript'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    JavaScript
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('python')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      selectedLanguage === 'python'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Python
                  </button>
                </div>
              </div>

              {/* コード表示 */}
              <div className="relative">
                <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                  <pre className="text-sm">
                    <code className="text-green-400">
                      {examples[selectedExample].languages[selectedLanguage]}
                    </code>
                  </pre>
                </div>
                <button
                  onClick={() => copyToClipboard(examples[selectedExample].languages[selectedLanguage])}
                  className="absolute top-4 right-4 bg-gray-800 text-gray-400 px-3 py-1 rounded hover:text-white transition-colors"
                >
                  コピー
                </button>
              </div>

              {/* 関連リンク */}
              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-bold mb-3">🔗 関連リソース</h3>
                <div className="space-y-2">
                  <a href="#" className="block text-blue-600 hover:underline">
                    → このサンプルの詳細な解説
                  </a>
                  <a href="#" className="block text-blue-600 hover:underline">
                    → GitHubで完全なコードを見る
                  </a>
                  <a href="#" className="block text-blue-600 hover:underline">
                    → オンラインで試す（CodeSandbox）
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}