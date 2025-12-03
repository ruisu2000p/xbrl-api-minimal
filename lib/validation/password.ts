import { z } from 'zod';

/**
 * パスワード強度検証スキーマ
 *
 * 要件:
 * - 8文字以上
 * - 大文字を1文字以上
 * - 小文字を1文字以上
 * - 数字を1文字以上
 * - 記号を1文字以上
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上にしてください')
  .regex(/[A-Z]/, '大文字を1文字以上含めてください')
  .regex(/[a-z]/, '小文字を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください')
  .regex(/[^A-Za-z0-9]/, '記号を1文字以上含めてください');

/**
 * パスワード検証（緩い要件）
 * レガシーシステムとの互換性のため
 */
export const passwordSchemaLegacy = z
  .string()
  .min(8, 'パスワードは8文字以上にしてください');

/**
 * パスワード強度をチェック
 * @returns 強度スコア (0-4)
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('8文字以上にしてください');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('大文字を含めてください');
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('小文字を含めてください');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('数字を含めてください');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('記号を含めてください');
  }

  return { score, feedback };
}

/**
 * パスワード強度のテキスト表現
 */
export function getPasswordStrengthText(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return '非常に弱い';
    case 2:
      return '弱い';
    case 3:
      return '普通';
    case 4:
      return '強い';
    case 5:
      return '非常に強い';
    default:
      return '不明';
  }
}
