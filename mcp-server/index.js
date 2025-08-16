#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// APIキーとベースURLの設定
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
const API_BASE_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app';

class XBRLAPIServer {
  constructor() {
    this.server = new Server(
      {
        name: 'xbrl-api-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // ツール一覧を返す
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_companies',
          description: '企業一覧を取得します（企業コード、企業名、業種など）',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: '取得する企業数の上限（デフォルト: 100）',
              },
              search: {
                type: 'string',
                description: '企業名で検索',
              },
            },
          },
        },
        {
          name: 'get_company_details',
          description: '特定企業の詳細情報を取得します',
          inputSchema: {
            type: 'object',
            properties: {
              company_id: {
                type: 'string',
                description: '企業ID（例: S100L3K4_株式会社タカショー）',
              },
            },
            required: ['company_id'],
          },
        },
        {
          name: 'get_financial_report',
          description: '企業の有価証券報告書のセクションを取得します',
          inputSchema: {
            type: 'object',
            properties: {
              company_id: {
                type: 'string',
                description: '企業ID',
              },
              section: {
                type: 'string',
                description: 'セクション名（例: 事業の内容、業績等の概要、経営方針）',
              },
            },
            required: ['company_id'],
          },
        },
        {
          name: 'search_companies_by_industry',
          description: '業種で企業を検索します',
          inputSchema: {
            type: 'object',
            properties: {
              industry: {
                type: 'string',
                description: '業種名（例: 製造業、サービス業、情報通信業）',
              },
            },
            required: ['industry'],
          },
        },
      ],
    }));

    // ツールの実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_companies':
            return await this.getCompanies(args);
          case 'get_company_details':
            return await this.getCompanyDetails(args);
          case 'get_financial_report':
            return await this.getFinancialReport(args);
          case 'search_companies_by_industry':
            return await this.searchCompaniesByIndustry(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `エラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async makeAPIRequest(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanies(args) {
    const { limit = 100, search } = args;
    
    try {
      // ローカルのダミーデータを返す（実際のAPIエンドポイントがまだない場合）
      const companies = [
        { id: 'S100L3K4_株式会社タカショー', name: '株式会社タカショー', industry: '製造業' },
        { id: 'S100L3K5_トヨタ自動車株式会社', name: 'トヨタ自動車株式会社', industry: '製造業' },
        { id: 'S100L3K6_ソフトバンクグループ株式会社', name: 'ソフトバンクグループ株式会社', industry: '情報通信業' },
        { id: 'S100L3K7_株式会社ファーストリテイリング', name: '株式会社ファーストリテイリング', industry: '小売業' },
        { id: 'S100L3K8_株式会社三菱UFJフィナンシャル・グループ', name: '株式会社三菱UFJフィナンシャル・グループ', industry: '銀行業' },
      ];

      let result = companies;
      if (search) {
        result = companies.filter(c => c.name.includes(search));
      }
      result = result.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: `${result.length}社の企業情報を取得しました:\n\n` +
                  result.map(c => `• ${c.name} (${c.id}) - ${c.industry}`).join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `企業一覧の取得に失敗しました: ${error.message}`,
          },
        ],
      };
    }
  }

  async getCompanyDetails(args) {
    const { company_id } = args;
    
    try {
      // ダミーデータ
      const details = {
        id: company_id,
        name: company_id.split('_')[1] || '不明',
        fiscal_year: '2021年度',
        employees: '約10,000名',
        capital: '100億円',
        headquarters: '東京都',
        description: '日本を代表する企業の一つです。',
      };

      return {
        content: [
          {
            type: 'text',
            text: `企業詳細情報:\n\n` +
                  `企業名: ${details.name}\n` +
                  `決算年度: ${details.fiscal_year}\n` +
                  `従業員数: ${details.employees}\n` +
                  `資本金: ${details.capital}\n` +
                  `本社: ${details.headquarters}\n` +
                  `概要: ${details.description}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `企業詳細の取得に失敗しました: ${error.message}`,
          },
        ],
      };
    }
  }

  async getFinancialReport(args) {
    const { company_id, section = '事業の内容' } = args;
    
    try {
      // ダミーデータ
      const report = {
        company_id,
        section,
        content: `【${section}】\n\n` +
                `当社グループは、主に以下の事業を展開しております。\n\n` +
                `1. 主要事業\n` +
                `   当社の主力事業として、製品の製造・販売を行っております。\n\n` +
                `2. 関連事業\n` +
                `   サービスの提供および関連製品の開発を行っております。\n\n` +
                `3. 今後の展開\n` +
                `   デジタル化を推進し、新たな価値創造を目指してまいります。`,
      };

      return {
        content: [
          {
            type: 'text',
            text: report.content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `有価証券報告書の取得に失敗しました: ${error.message}`,
          },
        ],
      };
    }
  }

  async searchCompaniesByIndustry(args) {
    const { industry } = args;
    
    try {
      // ダミーデータ
      const companies = [
        { name: 'トヨタ自動車株式会社', industry: '製造業' },
        { name: '株式会社タカショー', industry: '製造業' },
        { name: 'ソフトバンクグループ株式会社', industry: '情報通信業' },
        { name: '楽天グループ株式会社', industry: '情報通信業' },
        { name: '株式会社ファーストリテイリング', industry: '小売業' },
      ];

      const result = companies.filter(c => c.industry === industry);

      return {
        content: [
          {
            type: 'text',
            text: `業種「${industry}」の企業 ${result.length}社:\n\n` +
                  result.map(c => `• ${c.name}`).join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `業種検索に失敗しました: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('XBRL API MCP Server started');
  }
}

const server = new XBRLAPIServer();
server.run().catch(console.error);