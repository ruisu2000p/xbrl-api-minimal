'use server';

/**
 * Secure Server Actions Implementation
 * GitHub Security Alert #78 - セキュアなServer Actions
 */

import { ServerActionsCSRF } from '@/lib/security/server-actions-csrf';
import { XSSProtectionEnhanced } from '@/lib/security/xss-protection-enhanced';
import { NoSQLInjectionProtection } from '@/lib/security/nosql-injection-protection';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes, createHash } from 'crypto';

// レート制限用のメモリストア（本番環境ではRedis推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * セキュアなAPIキー作成
 */
export async function createApiKeySecure(formData: FormData) {
  const startTime = Date.now();

  try {
    // 1. CSRF トークン検証
    const isValidCSRF = await ServerActionsCSRF.validateServerAction(formData);
    if (!isValidCSRF) {
      throw new Error('Invalid CSRF token');
    }

    // 2. 入力検証とサニタイゼーション
    const keyName = sanitizeInput(formData.get('keyName') as string);
    const description = sanitizeInput(formData.get('description') as string);
    const tier = sanitizeInput(formData.get('tier') as string) || 'free';

    // 入力値の詳細検証
    if (!keyName || keyName.length < 3 || keyName.length > 50) {
      throw new Error('Invalid key name (3-50 characters required)');
    }

    if (description && description.length > 255) {
      throw new Error('Description too long (max 255 characters)');
    }

    if (!['free', 'basic', 'premium'].includes(tier)) {
      throw new Error('Invalid tier');
    }

    // 3. NoSQL Injection チェック
    const queryObject = { keyName, description, tier };
    if (!NoSQLInjectionProtection.validateQueryObject(queryObject)) {
      throw new Error('Invalid input detected');
    }

    // 4. レート制限チェック
    const clientIP = await getClientIP();
    const rateLimitResult = await checkRateLimit(clientIP, 'api_key_creation', 5, 3600000); // 5回/時間
    if (!rateLimitResult.allowed) {
      throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimitResult.resetTime).toLocaleTimeString()}`);
    }

    // 5. セッション認証確認
    const supabase = supabaseManager.getServiceClient();
    if (!supabase) {
      throw new Error('Service client not available');
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    // 6. 既存のAPIキー数チェック
    const { count: keyCount } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const maxKeys = tier === 'premium' ? 10 : tier === 'basic' ? 5 : 3;
    if ((keyCount || 0) >= maxKeys) {
      throw new Error(`Maximum number of API keys (${maxKeys}) reached for ${tier} tier`);
    }

    // 7. セキュアなAPIキー生成
    const apiKey = await generateSecureApiKey();
    const hashedKey = await hashApiKey(apiKey);

    // 8. データベースに保存
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_name: keyName,
        description: description || null,
        key_hash: hashedKey,
        key_prefix: apiKey.substring(0, 12), // プレフィックスのみ保存
        tier: tier,
        created_at: new Date().toISOString(),
        last_used_at: null,
        is_active: true,
        rate_limit: tier === 'premium' ? 1000 : tier === 'basic' ? 100 : 50
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create API key');
    }

    // 9. 監査ログ記録
    await logSecurityEvent({
      type: 'API_KEY_CREATED',
      user_id: user.id,
      ip_address: clientIP,
      metadata: {
        key_id: data.id,
        key_name: keyName,
        tier: tier
      }
    });

    // 10. 成功レスポンス（APIキーは一度だけ表示）
    return {
      success: true,
      apiKey: apiKey, // 初回のみ返却
      keyId: data.id,
      message: 'API key created successfully. Please save it securely as it won\'t be shown again.'
    };

  } catch (error) {
    // エラーハンドリング
    const clientIP = await getClientIP();
    await logSecurityEvent({
      type: 'API_KEY_CREATION_FAILED',
      user_id: 'unknown',
      ip_address: clientIP,
      error: (error as Error).message
    });

    return {
      success: false,
      error: (error as Error).message || 'Failed to create API key'
    };
  }
}

/**
 * APIキーの削除（セキュア）
 */
export async function deleteApiKeySecure(formData: FormData) {
  try {
    // CSRF検証
    const isValidCSRF = await ServerActionsCSRF.validateServerAction(formData);
    if (!isValidCSRF) {
      throw new Error('Invalid CSRF token');
    }

    // 入力検証
    const keyId = sanitizeInput(formData.get('keyId') as string);
    if (!keyId || !keyId.match(/^[a-f0-9-]{36}$/)) {
      throw new Error('Invalid key ID');
    }

    // 認証確認
    const supabase = supabaseManager.getServiceClient();
    if (!supabase) {
      throw new Error('Service client not available');
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    // 所有権確認と削除（論理削除）
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('user_id', user.id); // 所有権チェック

    if (error) {
      throw new Error('Failed to delete API key');
    }

    // 監査ログ
    await logSecurityEvent({
      type: 'API_KEY_DELETED',
      user_id: user.id,
      ip_address: await getClientIP(),
      metadata: { key_id: keyId }
    });

    return {
      success: true,
      message: 'API key deleted successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Failed to delete API key'
    };
  }
}

/**
 * 入力サニタイゼーション
 */
function sanitizeInput(input: string | null): string {
  if (!input) return '';

  // XSS対策
  let sanitized = XSSProtectionEnhanced.sanitizeForOutput(input) as string;

  // 追加のサニタイゼーション
  sanitized = sanitized
    .replace(/[^\w\s\-_.]/g, '') // 安全な文字のみ許可
    .trim()
    .slice(0, 255); // 長さ制限

  return sanitized;
}

/**
 * セキュアなAPIキー生成
 */
async function generateSecureApiKey(): Promise<string> {
  const prefix = 'xbrl_live_v2';
  const randomPart = randomBytes(24).toString('base64url'); // URLセーフ
  const timestamp = Date.now().toString(36);

  // チェックサム追加（改竄検知）
  const checksum = createHash('sha256')
    .update(`${prefix}_${timestamp}_${randomPart}`)
    .digest('hex')
    .substring(0, 6);

  return `${prefix}_${timestamp}_${randomPart}_${checksum}`;
}

/**
 * APIキーのハッシュ化
 */
async function hashApiKey(apiKey: string): Promise<string> {
  // SHA-256ハッシュ（bcryptより高速で十分なセキュリティ）
  return createHash('sha256')
    .update(apiKey + (process.env.API_KEY_SALT || 'default-salt'))
    .digest('hex');
}

/**
 * クライアントIP取得
 */
async function getClientIP(): Promise<string> {
  // Next.jsのheaders関数を使用
  const headersList = headers();

  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         headersList.get('x-real-ip') ||
         headersList.get('cf-connecting-ip') ||
         'unknown';
}

/**
 * レート制限チェック
 */
async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime: number }> {
  const key = `${identifier}:${action}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // 新しいウィンドウ
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, resetTime: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    return { allowed: false, resetTime: entry.resetTime };
  }

  return { allowed: true, resetTime: entry.resetTime };
}

/**
 * セキュリティイベントログ記録
 */
async function logSecurityEvent(event: {
  type: string;
  user_id: string;
  ip_address: string;
  metadata?: any;
  error?: string;
}): Promise<void> {
  try {
    const supabase = supabaseManager.getServiceClient();
    if (!supabase) {
      console.error('Service client not available for logging');
      return;
    }

    await supabase
      .from('security_logs')
      .insert({
        event_type: event.type,
        user_id: event.user_id,
        ip_address: event.ip_address,
        metadata: event.metadata || {},
        error_message: event.error || null,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // ログ記録失敗はサイレントに処理
    console.error('Failed to log security event:', error);
  }
}

// 再エクスポート
export { sanitizeInput, generateSecureApiKey, hashApiKey };

// Next.js用のヘッダー関数インポート
import { headers } from 'next/headers';