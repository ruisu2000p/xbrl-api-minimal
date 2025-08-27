/**
 * Base MCP Server Class
 * 共通機能を提供する基底クラス
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * MCPサーバーの基底クラス
 */
export class BaseMCPServer {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.server = null;
    this.config = null;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5分
  }

  /**
   * サーバーを初期化
   */
  initialize(capabilities = {}) {
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
          ...capabilities
        },
      }
    );
    return this.server;
  }

  /**
   * キャッシュを取得
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < this.cacheTimeout) {
        console.error(`[CACHE] Hit: ${key}`);
        return cached.data;
      } else {
        this.cache.delete(key);
        console.error(`[CACHE] Expired: ${key}`);
      }
    }
    return null;
  }

  /**
   * キャッシュを設定
   */
  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    console.error(`[CACHE] Set: ${key}`);
  }

  /**
   * 統一されたエラーレスポンスを生成
   */
  createErrorResponse(error, context = '') {
    const errorMessage = error.message || 'Unknown error occurred';
    console.error(`[ERROR] ${context}: ${errorMessage}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: errorMessage,
            context: context,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  /**
   * 統一された成功レスポンスを生成
   */
  createSuccessResponse(data, metadata = {}) {
    const response = {
      success: true,
      data: data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' 
            ? data 
            : JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  /**
   * サーバーを起動
   */
  async start() {
    try {
      console.error(`[INFO] Starting ${this.name} v${this.version}...`);
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error(`[INFO] ${this.name} is ready`);
    } catch (error) {
      console.error(`[FATAL] Failed to start ${this.name}:`, error);
      process.exit(1);
    }
  }

  /**
   * レート制限チェック
   */
  checkRateLimit(identifier, limit = 100, window = 3600000) {
    const key = `rate:${identifier}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (!cached) {
      this.cache.set(key, { count: 1, resetAt: now + window });
      return true;
    }

    if (now > cached.resetAt) {
      this.cache.set(key, { count: 1, resetAt: now + window });
      return true;
    }

    if (cached.count >= limit) {
      return false;
    }

    cached.count++;
    return true;
  }
}