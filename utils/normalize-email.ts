import punycode from 'punycode/'

/**
 * メールアドレスを正規化
 *
 * 正規化処理:
 * 1. 前後の空白を削除
 * 2. ゼロ幅文字（U+200B）を除去
 * 3. NFKC正規化（全角→半角など）
 * 4. ドメイン部分をPunycode変換（IDN対応）
 * 5. ドメイン部分を小文字化
 * 6. オプション: Gmail系の+アドレスを除去
 *
 * @param raw - 正規化前のメールアドレス
 * @param removePlusAddressing - +以降を削除するか（デフォルト: false）
 * @returns 正規化後のメールアドレス
 */
export function normalizeEmail(raw: string, removePlusAddressing: boolean = false): string {
  // 前後の空白とゼロ幅文字を除去
  const trimmed = raw.trim().replace(/\u200B/g, '')

  // @で分割
  const parts = trimmed.split('@')
  if (parts.length !== 2) {
    // 不正な形式の場合はそのまま返す（検証は別の関数で行う）
    return trimmed
  }

  let [local, domRaw] = parts

  // ローカル部分をNFKC正規化（全角英数字→半角など）
  local = local.normalize('NFKC')

  // +アドレスの除去（オプション）
  if (removePlusAddressing) {
    local = local.replace(/\+.*$/, '')
  }

  // ドメイン部分の処理
  try {
    // Punycode変換（IDN対応）と小文字化
    const domainAscii = punycode.toASCII(domRaw.toLowerCase())
    return `${local}@${domainAscii}`
  } catch (error) {
    // Punycode変換に失敗した場合は小文字化のみ
    console.warn('Punycode conversion failed for domain:', domRaw, error)
    return `${local}@${domRaw.toLowerCase()}`
  }
}

/**
 * メールアドレスの正規化例:
 *
 * 基本的な正規化:
 * - "  user@EXAMPLE.COM  " → "user@example.com"
 * - "user@例.jp" → "user@xn--r8j.jp" (Punycode)
 * - "ｕｓｅｒ@example.com" → "user@example.com" (全角→半角)
 *
 * +アドレス除去（removePlusAddressing=true）:
 * - "user+tag@gmail.com" → "user@gmail.com"
 * - "user+newsletter@example.com" → "user@example.com"
 */
