/**
 * エラーオブジェクトから文字列メッセージを抽出するヘルパー関数
 *
 * React Error #31 (Objects are not valid as a React child) を防ぐため、
 * あらゆる形式のエラーオブジェクトから文字列を確実に抽出します。
 *
 * @param errorData - エラーオブジェクト、文字列、またはその他の値
 * @param defaultMessage - デフォルトのエラーメッセージ (オプション)
 * @returns 抽出されたエラーメッセージ文字列
 *
 * @example
 * import { extractErrorMessage } from '@/utils/ui/extractErrorMessage';
 *
 * // 文字列の場合
 * extractErrorMessage('Something went wrong') // => 'Something went wrong'
 *
 * // エラーオブジェクトの場合
 * extractErrorMessage({ error: 'Invalid token' }) // => 'Invalid token'
 * extractErrorMessage({ message: 'Network error' }) // => 'Network error'
 * extractErrorMessage({ error: { message: 'DB error' } }) // => 'DB error'
 *
 * // その他の場合
 * extractErrorMessage(null) // => デフォルトメッセージ
 * extractErrorMessage(undefined) // => デフォルトメッセージ
 */
export function extractErrorMessage(
  errorData: any,
  defaultMessage: string = 'エラーが発生しました'
): string {
  // すでに文字列の場合
  if (typeof errorData === 'string') {
    return errorData.trim() || defaultMessage;
  }

  // null または undefined の場合
  if (errorData == null) {
    return defaultMessage;
  }

  // エラーオブジェクトの場合
  if (typeof errorData === 'object') {
    // errorData.error が文字列
    if (typeof errorData.error === 'string') {
      return errorData.error.trim() || defaultMessage;
    }

    // errorData.message が文字列
    if (typeof errorData.message === 'string') {
      return errorData.message.trim() || defaultMessage;
    }

    // errorData.error.message が文字列 (ネストされたエラー)
    if (typeof errorData.error?.message === 'string') {
      return errorData.error.message.trim() || defaultMessage;
    }

    // Stripe エラーの場合
    if (typeof errorData.raw?.message === 'string') {
      return errorData.raw.message.trim() || defaultMessage;
    }
  }

  // その他の場合はデフォルトメッセージを返す
  return defaultMessage;
}
