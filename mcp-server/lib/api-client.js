/**
 * API Client
 * Vercel APIとの通信を管理
 */

import { config } from './config-manager.js';

export class APIClient {
  constructor() {
    this.baseURL = config.getApiConfig().url;
    this.apiKey = config.getApiConfig().key;
    this.timeout = config.getApiConfig().timeout;
    this.retries = config.getApiConfig().retries;
  }

  /**
   * HTTPリクエストを送信（リトライ機能付き）
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const url = new URL(`/api/v1/${endpoint}`, this.baseURL);
    
    // クエリパラメータを追加
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // ヘッダーを設定
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // タイムアウト処理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        
        // リトライ可能なエラーの場合
        if (this.isRetryableError(response.status) && retryCount < this.retries) {
          console.error(`[API] Retrying request (${retryCount + 1}/${this.retries})...`);
          await this.delay(Math.pow(2, retryCount) * 1000); // 指数バックオフ
          return this.request(endpoint, options, retryCount + 1);
        }
        
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      // ネットワークエラーの場合、リトライ
      if (retryCount < this.retries && this.isNetworkError(error)) {
        console.error(`[API] Network error, retrying (${retryCount + 1}/${this.retries})...`);
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.request(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * GET リクエスト
   */
  async get(endpoint, params = {}) {
    return this.request(endpoint, { params });
  }

  /**
   * POST リクエスト
   */
  async post(endpoint, body = {}, params = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body,
      params
    });
  }

  /**
   * エラーレスポンスを解析
   */
  async parseErrorResponse(response) {
    try {
      const errorData = await response.json();
      return new Error(errorData.message || `API Error: ${response.status}`);
    } catch {
      const text = await response.text();
      return new Error(text || `API Error: ${response.status}`);
    }
  }

  /**
   * リトライ可能なエラーかチェック
   */
  isRetryableError(status) {
    return status === 429 || status === 503 || status >= 500;
  }

  /**
   * ネットワークエラーかチェック
   */
  isNetworkError(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('fetch failed');
  }

  /**
   * 遅延処理
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * APIキーを検証
   */
  async validateApiKey() {
    if (!this.apiKey) {
      return { valid: false, message: 'No API key configured' };
    }

    try {
      const response = await this.get('validate');
      return {
        valid: true,
        plan: response.plan,
        rateLimit: response.rate_limit,
        remaining: response.remaining
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * 企業を検索
   */
  async searchCompanies(query, limit = 10) {
    return this.get('companies', {
      search: query,
      limit: limit
    });
  }

  /**
   * 企業詳細を取得
   */
  async getCompanyDetails(companyId) {
    return this.get(`companies/${companyId}`);
  }

  /**
   * 財務書類を取得
   */
  async getDocuments(companyId, year) {
    return this.get('documents', {
      company_id: companyId,
      year: year
    });
  }

  /**
   * 書類内容を取得
   */
  async getDocumentContent(companyId, year, documentType) {
    return this.get('documents/content', {
      company_id: companyId,
      year: year,
      document_type: documentType
    });
  }

  /**
   * 財務分析を実行
   */
  async analyzeFinancials(companyId, year, analysisType = 'profitability') {
    return this.post('financial/analyze', {
      company_id: companyId,
      year: year,
      analysis_type: analysisType
    });
  }

  /**
   * 企業比較を実行
   */
  async compareCompanies(companyIds, year, metrics = ['revenue', 'profit', 'roe']) {
    return this.post('financial/compare', {
      company_ids: companyIds,
      year: year,
      metrics: metrics
    });
  }
}

// シングルトンインスタンス
export const apiClient = new APIClient();