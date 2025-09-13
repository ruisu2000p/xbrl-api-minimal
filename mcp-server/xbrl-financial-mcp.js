#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// 環境変数から設定を読み込み
const XBRL_API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';
const XBRL_API_KEY = process.env.XBRL_API_KEY || '';

class XBRLFinancialMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'xbrl-financial-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_companies',
            description: '企業を検索します。企業名、ティッカーコード、または業界で検索可能です。',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '検索クエリ（企業名、ティッカーコード）',
                },
                sector: {
                  type: 'string',
                  description: '業界名でフィルタリング',
                },
                page: {
                  type: 'number',
                  description: 'ページ番号（デフォルト: 1）',
                  default: 1,
                },
                per_page: {
                  type: 'number',
                  description: '1ページあたりの件数（デフォルト: 20）',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_company_documents',
            description: '企業の財務ドキュメント一覧を取得します。',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: '企業ID',
                },
                fiscal_year: {
                  type: 'string',
                  description: '年度（例: 2024）',
                },
                include_content: {
                  type: 'boolean',
                  description: 'コンテンツを含めるか',
                  default: false,
                },
              },
              required: ['company_id'],
            },
          },
          {
            name: 'get_document_detail',
            description: '特定のドキュメントの詳細情報とコンテンツを取得します。',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: '企業ID',
                },
                document_id: {
                  type: 'string',
                  description: 'ドキュメントID',
                },
                include_content: {
                  type: 'boolean',
                  description: 'コンテンツを含めるか',
                  default: true,
                },
                max_content_length: {
                  type: 'number',
                  description: '最大コンテンツ長（デフォルト: 10000）',
                  default: 10000,
                },
              },
              required: ['company_id', 'document_id'],
            },
          },
          {
            name: 'extract_financial_metrics',
            description: '特定のドキュメントから財務指標を抽出します。',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: '企業ID',
                },
                document_id: {
                  type: 'string',
                  description: 'ドキュメントID',
                },
                force_extract: {
                  type: 'boolean',
                  description: '強制再抽出（キャッシュを無視）',
                  default: false,
                },
                include_raw_data: {
                  type: 'boolean',
                  description: '生データを含めるか',
                  default: false,
                },
              },
              required: ['company_id', 'document_id'],
            },
          },
          {
            name: 'get_company_financial_metrics',
            description: '企業の財務指標一覧と時系列分析を取得します。',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: '企業ID',
                },
                fiscal_year: {
                  type: 'string',
                  description: '特定年度のフィルタ',
                },
                include_trends: {
                  type: 'boolean',
                  description: 'トレンド分析を含めるか',
                  default: true,
                },
                limit: {
                  type: 'number',
                  description: '最大取得件数',
                  default: 10,
                },
              },
              required: ['company_id'],
            },
          },
          {
            name: 'search_financial_metrics',
            description: '財務指標を検索・比較します。業界比較やランキング機能付き。',
            inputSchema: {
              type: 'object',
              properties: {
                company_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '比較対象企業ID一覧',
                },
                sector: {
                  type: 'string',
                  description: '業界名',
                },
                fiscal_year: {
                  type: 'string',
                  description: '年度',
                  default: '2024',
                },
                min_revenue: {
                  type: 'number',
                  description: '最小売上高',
                },
                max_revenue: {
                  type: 'number',
                  description: '最大売上高',
                },
                min_roe: {
                  type: 'number',
                  description: '最小ROE',
                },
                max_roe: {
                  type: 'number',
                  description: '最大ROE',
                },
                sort_by: {
                  type: 'string',
                  description: 'ソート項目',
                  enum: ['revenue', 'operating_profit', 'net_income', 'roe', 'roa'],
                  default: 'revenue',
                },
                include_rankings: {
                  type: 'boolean',
                  description: 'ランキングを含めるか',
                  default: true,
                },
                compare_industry: {
                  type: 'boolean',
                  description: '業界平均比較',
                  default: true,
                },
              },
            },
          },
          {
            name: 'get_financial_analysis',
            description: '企業の包括的財務分析レポートを生成します。',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: '企業ID',
                },
                fiscal_year: {
                  type: 'string',
                  description: '分析対象年度',
                  default: '2024',
                },
                years_back: {
                  type: 'number',
                  description: '過去何年分を含めるか',
                  default: 5,
                },
              },
              required: ['company_id'],
            },
          },
          {
            name: 'get_market_overview',
            description: '市場全体の概要と統計情報を取得します。',
            inputSchema: {
              type: 'object',
              properties: {
                fiscal_year: {
                  type: 'string',
                  description: '年度',
                  default: '2024',
                },
                sector: {
                  type: 'string',
                  description: '特定業界のフィルタ',
                },
                top_companies: {
                  type: 'number',
                  description: 'トップ企業数',
                  default: 10,
                },
              },
            },
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_companies':
            return await this.searchCompanies(args);

          case 'get_company_documents':
            return await this.getCompanyDocuments(args);

          case 'get_document_detail':
            return await this.getDocumentDetail(args);

          case 'extract_financial_metrics':
            return await this.extractFinancialMetrics(args);

          case 'get_company_financial_metrics':
            return await this.getCompanyFinancialMetrics(args);

          case 'search_financial_metrics':
            return await this.searchFinancialMetrics(args);

          case 'get_financial_analysis':
            return await this.getFinancialAnalysis(args);

          case 'get_market_overview':
            return await this.getMarketOverview(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async makeAPIRequest(endpoint, params = {}) {
    const url = new URL(`${XBRL_API_URL}${endpoint}`);
    
    // パラメータをクエリストリングに追加
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });

    const headers = {
      'Accept': 'application/json',
    };

    if (XBRL_API_KEY) {
      headers['X-API-Key'] = XBRL_API_KEY;
    }

    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async searchCompanies(args) {
    const { query, sector, page = 1, per_page = 20 } = args;
    
    const params = {
      page,
      per_page,
    };

    if (query) params.search = query;
    if (sector) params.sector = sector;

    const data = await this.makeAPIRequest('/companies', params);

    return {
      content: [
        {
          type: 'text',
          text: `企業検索結果:\n\n` +
                `総件数: ${data.pagination?.total || 0}件\n` +
                `表示: ${data.data?.length || 0}件\n\n` +
                data.data?.map(company => 
                  `【${company.company_name}】\n` +
                  `- 企業ID: ${company.id}\n` +
                  `- ティッカー: ${company.ticker_code || 'N/A'}\n` +
                  `- 業界: ${company.sector || 'N/A'}\n`
                ).join('\n') || '結果がありません。',
        },
      ],
    };
  }

  async getCompanyDocuments(args) {
    const { company_id, fiscal_year, include_content = false } = args;
    
    const params = {
      include_content,
    };

    if (fiscal_year) params.fiscal_year = fiscal_year;

    const data = await this.makeAPIRequest(`/documents/${company_id}`, params);

    return {
      content: [
        {
          type: 'text',
          text: `【${data.company?.company_name}】の財務ドキュメント:\n\n` +
                `総件数: ${data.statistics?.total_documents || 0}件\n` +
                `年度: ${data.statistics?.fiscal_years?.join(', ') || 'N/A'}\n\n` +
                `ドキュメント一覧:\n` +
                data.data?.map(doc => 
                  `- ${doc.file_name}\n` +
                  `  ID: ${doc.id}\n` +
                  `  年度: ${doc.fiscal_year}\n` +
                  `  サイズ: ${Math.round(doc.file_size / 1024)}KB\n`
                ).join('\n') || 'ドキュメントがありません。',
        },
      ],
    };
  }

  async getDocumentDetail(args) {
    const { company_id, document_id, include_content = true, max_content_length = 10000 } = args;
    
    const params = {
      include_content,
      max_content_length,
    };

    const data = await this.makeAPIRequest(`/documents/${company_id}/${document_id}`, params);
    const doc = data.document;

    let text = `【${doc.company_name}】${doc.file_name} 詳細:\n\n`;
    text += `年度: ${doc.fiscal_year}\n`;
    text += `ファイルサイズ: ${Math.round(doc.file_size / 1024)}KB\n`;
    
    if (doc.content_analysis) {
      text += `文字数: ${doc.content_analysis.total_characters.toLocaleString()}\n`;
      text += `行数: ${doc.content_analysis.total_lines.toLocaleString()}\n`;
      text += `推定読了時間: ${doc.content_analysis.estimated_reading_time_minutes}分\n\n`;
    }

    if (doc.headings && doc.headings.length > 0) {
      text += `主要セクション:\n`;
      doc.headings.forEach(heading => {
        const indent = '  '.repeat(heading.level - 1);
        text += `${indent}- ${heading.text}\n`;
      });
      text += '\n';
    }

    if (include_content && doc.content) {
      text += `コンテンツ:\n${'='.repeat(50)}\n`;
      text += doc.content;
      if (doc.content_truncated) {
        text += `\n\n（${doc.full_content_length.toLocaleString()}文字中${max_content_length.toLocaleString()}文字を表示）`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async extractFinancialMetrics(args) {
    const { company_id, document_id, force_extract = false, include_raw_data = false } = args;
    
    const params = {
      force_extract,
      include_raw_data,
    };

    const data = await this.makeAPIRequest(`/financial-metrics/${company_id}/${document_id}`, params);
    const metrics = data.metrics;

    let text = `【${metrics.company_name}】${metrics.fiscal_year}年度 財務指標:\n\n`;
    
    // 損益情報
    if (metrics.revenue || metrics.operating_profit || metrics.net_income) {
      text += `📊 損益情報:\n`;
      if (metrics.revenue) text += `売上高: ${(metrics.revenue / 100000000).toFixed(1)}億円\n`;
      if (metrics.operating_profit) text += `営業利益: ${(metrics.operating_profit / 100000000).toFixed(1)}億円\n`;
      if (metrics.ordinary_profit) text += `経常利益: ${(metrics.ordinary_profit / 100000000).toFixed(1)}億円\n`;
      if (metrics.net_income) text += `当期純利益: ${(metrics.net_income / 100000000).toFixed(1)}億円\n`;
      text += '\n';
    }

    // 財政状態
    if (metrics.total_assets || metrics.net_assets) {
      text += `🏦 財政状態:\n`;
      if (metrics.total_assets) text += `総資産: ${(metrics.total_assets / 100000000).toFixed(1)}億円\n`;
      if (metrics.total_liabilities) text += `総負債: ${(metrics.total_liabilities / 100000000).toFixed(1)}億円\n`;
      if (metrics.net_assets) text += `純資産: ${(metrics.net_assets / 100000000).toFixed(1)}億円\n`;
      text += '\n';
    }

    // 財務比率
    if (metrics.roe || metrics.roa || metrics.operating_margin) {
      text += `📈 財務比率:\n`;
      if (metrics.roe) text += `ROE: ${metrics.roe.toFixed(2)}%\n`;
      if (metrics.roa) text += `ROA: ${metrics.roa.toFixed(2)}%\n`;
      if (metrics.operating_margin) text += `営業利益率: ${metrics.operating_margin.toFixed(2)}%\n`;
      if (metrics.net_margin) text += `純利益率: ${metrics.net_margin.toFixed(2)}%\n`;
      text += '\n';
    }

    // 抽出情報
    text += `ℹ️ 抽出情報:\n`;
    text += `信頼度: ${metrics.confidence_score}%\n`;
    text += `抽出方法: ${metrics.extraction_method}\n`;
    text += `キャッシュ: ${data.cached ? 'あり' : 'なし'}\n`;

    if (data.warnings && data.warnings.length > 0) {
      text += `\n⚠️ 警告:\n${data.warnings.join('\n')}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async getCompanyFinancialMetrics(args) {
    const { company_id, fiscal_year, include_trends = true, limit = 10 } = args;
    
    const params = {
      include_trends,
      limit,
    };

    if (fiscal_year) params.fiscal_year = fiscal_year;

    const data = await this.makeAPIRequest(`/financial-metrics/${company_id}`, params);

    let text = `【${data.company.company_name}】財務指標時系列分析:\n\n`;
    
    text += `📊 統計情報:\n`;
    text += `総ドキュメント数: ${data.statistics.total_documents}\n`;
    text += `財務指標抽出済み: ${data.statistics.metrics_extracted}\n`;
    text += `対象年度: ${data.statistics.fiscal_years.join(', ')}\n`;
    text += `平均信頼度: ${data.statistics.average_confidence.toFixed(1)}%\n\n`;

    if (data.metrics && data.metrics.length > 0) {
      text += `📈 年度別財務指標:\n`;
      data.metrics.forEach(metric => {
        text += `\n【${metric.fiscal_year}年度】\n`;
        if (metric.revenue) text += `売上高: ${(metric.revenue / 100000000).toFixed(1)}億円\n`;
        if (metric.operating_profit) text += `営業利益: ${(metric.operating_profit / 100000000).toFixed(1)}億円\n`;
        if (metric.net_income) text += `当期純利益: ${(metric.net_income / 100000000).toFixed(1)}億円\n`;
        if (metric.roe) text += `ROE: ${metric.roe.toFixed(2)}%\n`;
      });
    }

    if (data.time_series && data.time_series.trends) {
      text += `\n📊 トレンド分析:\n`;
      Object.entries(data.time_series.trends).forEach(([key, trend]) => {
        const label = {
          revenue: '売上高',
          operating_profit: '営業利益',
          net_income: '当期純利益',
          total_assets: '総資産',
        }[key] || key;
        
        const trendIcon = trend.trend === 'increasing' ? '📈' : 
                         trend.trend === 'decreasing' ? '📉' : '➡️';
        
        text += `${trendIcon} ${label}: ${trend.percentage_change.toFixed(1)}% (${trend.trend})\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async searchFinancialMetrics(args) {
    const data = await this.makeAPIRequest('/financial-metrics', args);

    let text = `財務指標検索結果:\n\n`;
    
    text += `📊 検索統計:\n`;
    text += `該当企業数: ${data.statistics.total_companies}\n`;
    text += `売上データあり: ${data.statistics.companies_with_revenue}\n`;
    text += `平均売上高: ${(data.statistics.average_revenue / 100000000).toFixed(1)}億円\n`;
    text += `平均ROE: ${data.statistics.average_roe.toFixed(2)}%\n\n`;

    if (data.industry_average) {
      text += `🏭 業界平均:\n`;
      if (data.industry_average.revenue) text += `売上高: ${(data.industry_average.revenue / 100000000).toFixed(1)}億円\n`;
      if (data.industry_average.roe) text += `ROE: ${data.industry_average.roe.toFixed(2)}%\n`;
      if (data.industry_average.roa) text += `ROA: ${data.industry_average.roa.toFixed(2)}%\n\n`;
    }

    if (data.data && data.data.length > 0) {
      text += `📈 企業一覧:\n`;
      data.data.forEach((company, index) => {
        text += `\n${index + 1}. ${company.company_name}\n`;
        if (company.revenue) text += `   売上高: ${(company.revenue / 100000000).toFixed(1)}億円\n`;
        if (company.roe) text += `   ROE: ${company.roe.toFixed(2)}%\n`;
        if (company.operating_margin) text += `   営業利益率: ${company.operating_margin.toFixed(2)}%\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async getFinancialAnalysis(args) {
    const { company_id, fiscal_year = '2024', years_back = 5 } = args;
    
    const params = {
      fiscal_year,
      years_back,
    };

    const data = await this.makeAPIRequest(`/financial-analysis/${company_id}`, params);
    const report = data.analysis_report;

    let text = `【${data.company.company_name}】包括的財務分析レポート\n`;
    text += `対象年度: ${fiscal_year}\n`;
    text += `分析期間: 過去${years_back}年\n\n`;

    // 財務健全性
    text += `🏆 財務健全性スコア: ${report.financial_health.score}/100 (${report.financial_health.grade}グレード)\n\n`;
    text += `詳細スコア:\n`;
    text += `- 流動性: ${report.financial_health.factors.liquidity}/25\n`;
    text += `- 収益性: ${report.financial_health.factors.profitability}/30\n`;
    text += `- 効率性: ${report.financial_health.factors.efficiency}/25\n`;
    text += `- レバレッジ: ${report.financial_health.factors.leverage}/20\n\n`;

    // 成長性分析
    text += `📈 成長性分析:\n`;
    text += `成長ステージ: ${report.growth_analysis.growth_stage}\n`;
    text += `売上成長率: ${report.growth_analysis.revenue_growth.toFixed(2)}%\n`;
    text += `利益成長率: ${report.growth_analysis.profit_growth.toFixed(2)}%\n`;
    text += `資産成長率: ${report.growth_analysis.asset_growth.toFixed(2)}%\n\n`;

    // リスク評価
    text += `⚠️ リスク評価:\n`;
    text += `財務リスク: ${report.risk_assessment.financial_risk}\n`;
    text += `事業リスク: ${report.risk_assessment.business_risk}\n`;
    text += `市場リスク: ${report.risk_assessment.market_risk}\n`;
    text += `総合リスク: ${report.risk_assessment.overall_risk}\n\n`;

    // 推奨事項
    text += `💡 推奨事項:\n`;
    report.recommendations.forEach((rec, index) => {
      text += `${index + 1}. ${rec}\n`;
    });

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async getMarketOverview(args) {
    const { fiscal_year = '2024', sector, top_companies = 10 } = args;
    
    // 市場概要を取得するため、複数のAPIを組み合わせ
    const params = {
      fiscal_year,
      per_page: top_companies,
      sort_by: 'revenue',
      sort_order: 'desc',
    };

    if (sector) params.sector = sector;

    const data = await this.makeAPIRequest('/financial-metrics', params);

    let text = `📊 ${sector ? `${sector}業界` : '全市場'}概要 (${fiscal_year}年度)\n\n`;
    
    text += `📈 市場統計:\n`;
    text += `対象企業数: ${data.statistics.total_companies}\n`;
    text += `平均売上高: ${(data.statistics.average_revenue / 100000000).toFixed(1)}億円\n`;
    text += `平均ROE: ${data.statistics.average_roe.toFixed(2)}%\n\n`;

    if (data.data && data.data.length > 0) {
      text += `🏆 トップ${top_companies}企業 (売上高順):\n`;
      data.data.forEach((company, index) => {
        text += `\n${index + 1}. ${company.company_name}\n`;
        text += `   売上高: ${(company.revenue / 100000000).toFixed(1)}億円\n`;
        if (company.operating_profit) text += `   営業利益: ${(company.operating_profit / 100000000).toFixed(1)}億円\n`;
        if (company.roe) text += `   ROE: ${company.roe.toFixed(2)}%\n`;
        if (company.sector) text += `   業界: ${company.sector}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('XBRL Financial MCP Server running on stdio');
  }
}

const server = new XBRLFinancialMCPServer();
server.run().catch(console.error);