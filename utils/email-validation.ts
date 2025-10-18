import dns from 'dns/promises';
import { normalizeEmail } from './normalize-email';

// 使い捨てメールドメインのブラックリスト
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  'trashmail.com',
]);

// よくあるタイポとその修正候補
const TYPO_SUGGESTIONS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yahho.co.jp': 'yahoo.co.jp',
  'yahooo.co.jp': 'yahoo.co.jp',
  'outlok.com': 'outlook.com',
  'outook.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
};

/**
 * メールアドレスの形式を検証
 */
export function isValidEmailFormat(email: string): boolean {
  // RFC 5322 の簡易版パターン
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * 使い捨てメールアドレスかどうかをチェック
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * ドメインのタイポをチェックし、修正候補を返す
 */
export function getTypoSuggestion(email: string): string | undefined {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return undefined;
  return TYPO_SUGGESTIONS[domain];
}

/**
 * ドメインがメールを受信できる可能性が高いかをチェック
 * MXレコード、またはA/AAAAレコードの存在を確認
 */
export async function canDomainReceiveMail(domain: string): Promise<boolean> {
  try {
    // 1. MXレコードをチェック（優先）
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      return true;
    }
  } catch (error) {
    // MXレコードが見つからない場合は続行
  }

  try {
    // 2. A レコードをチェック（IPv4）
    const aRecords = await dns.resolve4(domain);
    if (aRecords && aRecords.length > 0) {
      return true;
    }
  } catch (error) {
    // A レコードが見つからない場合は続行
  }

  try {
    // 3. AAAA レコードをチェック（IPv6）
    const aaaaRecords = await dns.resolve6(domain);
    if (aaaaRecords && aaaaRecords.length > 0) {
      return true;
    }
  } catch (error) {
    // AAAA レコードも見つからない
  }

  return false;
}

/**
 * メールアドレスの包括的な検証
 */
export async function validateEmail(email: string): Promise<{
  valid: boolean;
  error?: string;
  suggestion?: string;
  normalizedEmail?: string;
}> {
  // 0. メールアドレスの正規化
  const normalizedEmail = normalizeEmail(email);

  // 1. 形式チェック
  if (!isValidEmailFormat(normalizedEmail)) {
    return {
      valid: false,
      error: 'メールアドレスの形式が正しくありません',
    };
  }

  const domain = normalizedEmail.split('@')[1];

  // 2. 使い捨てメールチェック
  if (isDisposableEmail(normalizedEmail)) {
    return {
      valid: false,
      error: '使い捨てメールアドレスは利用できません',
      normalizedEmail,
    };
  }

  // 3. タイポチェック
  const suggestion = getTypoSuggestion(normalizedEmail);

  // 4. ドメインの受信可能性チェック
  const canReceive = await canDomainReceiveMail(domain);
  if (!canReceive) {
    return {
      valid: false,
      error: 'このドメインはメールを受信できない可能性があります',
      suggestion,
      normalizedEmail,
    };
  }

  return {
    valid: true,
    suggestion, // タイポの可能性があれば警告として返す
    normalizedEmail, // 正規化されたメールアドレスを返す
  };
}

/**
 * キャッシュ付きドメイン検証（パフォーマンス向上）
 */
const domainCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

export async function canDomainReceiveMailCached(domain: string): Promise<boolean> {
  const now = Date.now();
  const cached = domainCache.get(domain);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await canDomainReceiveMail(domain);
  domainCache.set(domain, { result, timestamp: now });

  // キャッシュサイズ制限（10000エントリまで）
  if (domainCache.size > 10000) {
    const firstKey = domainCache.keys().next().value;
    if (firstKey) domainCache.delete(firstKey);
  }

  return result;
}
