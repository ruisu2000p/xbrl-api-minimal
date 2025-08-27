#!/usr/bin/env node

/**
 * XBRL MCP Server - Optimized Version
 * 最適化された統一版MCPサーバー
 */

import { BaseMCPServer } from './lib/base-server.js';
import { config } from './lib/config-manager.js';
import { apiClient } from './lib/api-client.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * 最適化されたXBRL MCPサーバー
 */
class XBRLMCPServer extends BaseMCPServer {
  constructor() {
    super('xbrl-optimized-mcp', '2.0.0');
    this.authenticated = false;
  }

  /**
   * 初期化と認証
   */
  async initialize() {
    super.initialize();
    
    // APIキーの検証
    if (config.getApiConfig().key) {
      const validation = await apiClient.validateApiKey();
      this.authenticated = validation.valid;
      
      if (this.authenticated) {
        console.error(`[AUTH] Authenticated - Plan: ${validation.plan}`);
      } else {
        console.error(`[AUTH] Authentication failed: ${validation.message}`);
      }
    } else {
      console.error('[AUTH] No API key configured - Limited access');
    }

    // ツール定義
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.getAvailableTools() };
    });

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.executeeTool(request.params);
    });
  }

  /**
   * 利用可能なツールを取得
   */
  getAvailableTools() {
    const tools = [
      {
        name: 'search_companies',
        description: '企業を検索（企業名または業種）',
        inputSchema: {
          type: 'object',
          properties: {
            query: { 
              type: 'string', 
              description: '検索キーワード' 
            },
            limit: { 
              type: 'number', 
              description: '最大件数（デフォルト: 10）',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_company',
        description: '企業詳細を取得',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { 
              type: 'string', 
              description: '企業ID（例: S100LJ4F）' 
            }
          },
          required: ['company_id']
        }
      },
      {
        name: 'get_documents',
        description: '財務書類一覧を取得',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: '企業ID' },
            year: { type: 'string', description: '年度（例: 2021）' }
          },
          required: ['company_id']
        }
      },
      {
        name: 'read_document',
        description: '書類内容を読み込み',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: '企業ID' },
            year: { type: 'string', description: '年度' },
            document_type: { 
              type: 'string', 
              description: '書類タイプ（例: 0101010）' 
            }
          },
          required: ['company_id', 'year', 'document_type']
        }
      }
    ];

    // 認証済みの場合、追加ツールを提供
    if (this.authenticated) {
      tools.push({
        name: 'analyze_financial',
        description: '財務データを分析（認証必要）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: '企業ID' },
            year: { type: 'string', description: '年度' },
            analysis_type: {
              type: 'string',
              description: '分析タイプ',
              enum: ['profitability', 'growth', 'efficiency'],
              default: 'profitability'
            }
          },
          required: ['company_id', 'year']
        }
      });

      tools.push({
        name: 'compare_companies',
        description: '複数企業を比較（認証必要）',
        inputSchema: {
          type: 'object',
          properties: {
            company_ids: {
              type: 'array',
              items: { type: 'string' },
              description: '比較する企業IDリスト'
            },
            year: { type: 'string', description: '年度' },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: '比較指標',
              default: ['revenue', 'profit', 'roe']
            }
          },
          required: ['company_ids', 'year']
        }
      });
    }

    return tools;
  }

  /**
   * ツールを実行
   */
  async executeeTool(params) {
    const { name, arguments: args } = params;
    
    // キャッシュキー生成
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    
    // キャッシュチェック
    if (config.getCacheConfig().enabled) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return this.createSuccessResponse(cached, { cached: true });
      }
    }

    // レート制限チェック
    if (config.getRateLimitConfig().enabled) {
      const identifier = config.getApiConfig().key || 'anonymous';
      if (!this.checkRateLimit(identifier)) {
        return this.createErrorResponse(
          new Error('Rate limit exceeded'),
          'Rate limit check'
        );
      }
    }

    try {
      let result;

      switch (name) {
        case 'search_companies':
          result = await apiClient.searchCompanies(args.query, args.limit);
          break;

        case 'get_company':
          result = await apiClient.getCompanyDetails(args.company_id);
          break;

        case 'get_documents':
          result = await apiClient.getDocuments(args.company_id, args.year);
          break;

        case 'read_document':
          result = await apiClient.getDocumentContent(
            args.company_id,
            args.year,
            args.document_type
          );
          break;

        case 'analyze_financial':
          if (!this.authenticated) {
            throw new Error('Authentication required');
          }
          result = await apiClient.analyzeFinancials(
            args.company_id,
            args.year,
            args.analysis_type
          );
          break;

        case 'compare_companies':
          if (!this.authenticated) {
            throw new Error('Authentication required');
          }
          result = await apiClient.compareCompanies(
            args.company_ids,
            args.year,
            args.metrics
          );
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // キャッシュに保存
      if (config.getCacheConfig().enabled) {
        this.setCache(cacheKey, result);
      }

      return this.createSuccessResponse(result);
      
    } catch (error) {
      return this.createErrorResponse(error, `Tool: ${name}`);
    }
  }

  /**
   * サーバーを起動
   */
  async start() {
    console.error('='.repeat(50));
    console.error('XBRL MCP Server - Optimized Version');
    console.error('='.repeat(50));
    console.error('Configuration:', config.getSummary());
    console.error('='.repeat(50));
    
    await this.initialize();
    await super.start();
  }
}

// メイン実行
async function main() {
  const server = new XBRLMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error('[FATAL] Server failed:', error);
  process.exit(1);
});