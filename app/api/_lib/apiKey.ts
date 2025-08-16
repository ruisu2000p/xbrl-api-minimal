/**
 * APIキー管理ユーティリティ
 * - 生成、ハッシュ化、プレフィックス処理
 */

import crypto from 'crypto';

// 環境変数からプレフィックスを取得（デフォルト値あり）
const DEFAULT_PREFIX = 'sk_live_xbrl_';

/**
 * APIキーをSHA256でハッシュ化（データベース保存用）
 */
export function hashApiKey(plainKey: string): string {
  return crypto
    .createHash('sha256')
    .update(plainKey)
    .digest('base64');
}

/**
 * 新しいAPIキーを生成
 * @param prefix キーのプレフィックス（デフォルト: sk_live_xbrl_）
 */
export function generateApiKey(prefix?: string): string {
  const keyPrefix = prefix || process.env.API_KEY_PREFIX || DEFAULT_PREFIX;
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${keyPrefix}${randomBytes}`;
}

/**
 * APIキーの先頭部分を取得（表示用）
 * @param plainKey 平文のAPIキー
 * @param length 取得する文字数
 */
export function getKeyPrefix(plainKey: string, length: number = 16): string {
  return plainKey.slice(0, length);
}

/**
 * APIキーの末尾部分を取得（表示用）
 * @param plainKey 平文のAPIキー
 * @param length 取得する文字数
 */
export function getKeySuffix(plainKey: string, length: number = 4): string {
  return plainKey.slice(-length);
}

/**
 * APIキーをマスク表示用にフォーマット
 * 例: sk_live_xbrl_xxxx...xxxx
 */
export function maskApiKey(plainKey: string): string {
  const prefix = getKeyPrefix(plainKey, 16);
  const suffix = getKeySuffix(plainKey, 4);
  return `${prefix}...${suffix}`;
}

/**
 * APIキーのバリデーション（フォーマットチェック）
 */
export function validateApiKeyFormat(plainKey: string): boolean {
  // 最低限の長さチェック
  if (plainKey.length < 32) return false;
  
  // プレフィックスチェック（sk_で始まる）
  if (!plainKey.startsWith('sk_')) return false;
  
  // 不正な文字が含まれていないかチェック
  const validPattern = /^sk_[a-zA-Z0-9_-]+$/;
  return validPattern.test(plainKey);
}

/**
 * APIキーの有効期限を計算
 * @param days 有効日数（デフォルト: 365日）
 */
export function calculateExpiryDate(days: number = 365): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
}

/**
 * APIキーが有効期限内かチェック
 */
export function isKeyExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // 有効期限なし
  return new Date(expiresAt) < new Date();
}