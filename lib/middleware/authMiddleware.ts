import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth'
import crypto from 'crypto'

interface ApiKeyValidation {
  valid: boolean
  error?: string
  keyData?: any
  remaining?: number
  retryAfter?: string
}

export async function validateApiKeyWithDB(
  apiKey: string,
  request: NextRequest
): Promise<ApiKeyValidation> {
  try {
    const supabase = createSupabaseAuthServerClient()
    
    // ハッシュ化
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // DB検索（レート制限情報も含む）
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        api_key_rate_limits (*)
      `)
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single()
    
    if (error || !keyData) {
      return { valid: false, error: 'Invalid API key' }
    }
    
    // 有効期限チェック
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      await supabase
        .from('api_keys')
        .update({ status: 'expired' })
        .eq('id', keyData.id)
      
      return { valid: false, error: 'API key expired' }
    }
    
    // レート制限チェック
    const rateLimit = keyData.api_key_rate_limits?.[0]
    if (rateLimit) {
      const now = Date.now()
      
      // 時間リセットチェック
      if (new Date(rateLimit.last_hour_reset).getTime() + 3600000 < now) {
        await supabase
          .from('api_key_rate_limits')
          .update({ 
            current_hour_count: 0,
            last_hour_reset: new Date().toISOString()
          })
          .eq('api_key_id', keyData.id)
        
        rateLimit.current_hour_count = 0
      }
      
      // 日リセットチェック
      if (new Date(rateLimit.last_day_reset).getTime() + 86400000 < now) {
        await supabase
          .from('api_key_rate_limits')
          .update({ 
            current_day_count: 0,
            last_day_reset: new Date().toISOString()
          })
          .eq('api_key_id', keyData.id)
        
        rateLimit.current_day_count = 0
      }
      
      // レート制限超過チェック
      if (rateLimit.current_hour_count >= rateLimit.requests_per_hour) {
        return { 
          valid: false, 
          error: 'Hourly rate limit exceeded',
          retryAfter: new Date(new Date(rateLimit.last_hour_reset).getTime() + 3600000).toISOString()
        }
      }
      
      if (rateLimit.current_day_count >= rateLimit.requests_per_day) {
        return { 
          valid: false, 
          error: 'Daily rate limit exceeded',
          retryAfter: new Date(new Date(rateLimit.last_day_reset).getTime() + 86400000).toISOString()
        }
      }
      
      // カウンタ更新
      await supabase
        .from('api_key_rate_limits')
        .update({ 
          current_hour_count: rateLimit.current_hour_count + 1,
          current_day_count: rateLimit.current_day_count + 1,
          current_month_count: rateLimit.current_month_count + 1
        })
        .eq('api_key_id', keyData.id)
    }
    
    // 使用状況ログ記録
    const { pathname, searchParams } = request.nextUrl
    await supabase
      .from('api_key_usage_logs')
      .insert({
        api_key_id: keyData.id,
        endpoint: pathname,
        method: request.method,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })
    
    // APIキーの統計更新
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        total_requests: keyData.total_requests + 1,
        successful_requests: keyData.successful_requests + 1
      })
      .eq('id', keyData.id)
    
    return { 
      valid: true, 
      keyData,
      remaining: rateLimit ? rateLimit.requests_per_hour - rateLimit.current_hour_count - 1 : undefined
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return { valid: false, error: 'Internal validation error' }
  }
}

// レスポンスに使用状況ヘッダーを追加
export function addRateLimitHeaders(
  response: NextResponse,
  validation: ApiKeyValidation
): NextResponse {
  if (validation.keyData && validation.keyData.api_key_rate_limits?.[0]) {
    const rateLimit = validation.keyData.api_key_rate_limits[0]
    
    response.headers.set('X-RateLimit-Limit', rateLimit.requests_per_hour.toString())
    response.headers.set('X-RateLimit-Remaining', (validation.remaining || 0).toString())
    
    if (validation.retryAfter) {
      response.headers.set('Retry-After', validation.retryAfter)
    }
  }
  
  return response
}