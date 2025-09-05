/**
 * API使用状況ログ記録ヘルパー
 */

import { admin } from './supabaseAdmin';

interface ApiLogData {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  requestBody?: any;
  responseBody?: any;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * API使用ログを記録
 */
export async function logApiUsage(data: ApiLogData) {
  try {
    const { error } = await admin
      .from('api_usage_logs')
      .insert({
        api_key_id: data.apiKeyId,
        endpoint: data.endpoint,
        method: data.method,
        status_code: data.statusCode,
        response_time_ms: data.responseTimeMs,
        request_body: data.requestBody,
        response_body: data.responseBody,
        error_message: data.errorMessage,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      });

    if (error) {
      console.error('Failed to log API usage:', error);
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

/**
 * APIキーの月次使用状況を取得
 */
export async function getApiKeyMonthlyUsage(apiKeyId: string) {
  try {
    const { data, error } = await admin
      .rpc('get_api_key_monthly_usage', { p_api_key_id: apiKeyId });

    if (error) {
      console.error('Failed to get monthly usage:', error);
      return null;
    }

    return data?.[0] || {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      remaining_quota: 1000,
      quota_limit: 1000,
    };
  } catch (error) {
    console.error('Error getting monthly usage:', error);
    return null;
  }
}

/**
 * 複数のAPIキーの月次使用状況を集計
 */
export async function getAllKeysMonthlyUsage(apiKeyIds: string[]) {
  try {
    const { data, error } = await admin
      .rpc('get_all_keys_monthly_usage', { p_key_ids: apiKeyIds });

    if (error) {
      console.error('Failed to get all keys monthly usage:', error);
      return null;
    }

    return data?.[0] || {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      remaining_quota: 1000,
      quota_limit: 1000,
    };
  } catch (error) {
    console.error('Error getting all keys monthly usage:', error);
    return null;
  }
}

/**
 * APIキーの最近のアクティビティを取得
 */
export async function getApiKeyRecentActivity(apiKeyId: string, limit: number = 10) {
  try {
    const { data, error } = await admin
      .rpc('get_api_key_recent_activity', { 
        p_api_key_id: apiKeyId,
        p_limit: limit 
      });

    if (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}