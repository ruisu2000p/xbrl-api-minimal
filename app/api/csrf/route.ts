// Force Node.js runtime (crypto requires Node.js, not Edge Runtime)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * CSRF Token API
 *
 * クライアント側で最新のCSRFトークンを取得するためのエンドポイント
 * APIを叩く直前に呼び出して、常に最新のトークンを使用することで
 * Auth状態の揺れによるトークンのズレを防ぐ
 */
export async function GET() {
  // 新しいCSRFトークンを生成
  const token = crypto.randomUUID().replace(/-/g, '');

  const response = NextResponse.json(
    { csrfToken: token },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    }
  );

  // Double Submit Cookie パターン
  // クライアントはこのトークンをヘッダー X-CSRF-Token に含めて送信する
  response.cookies.set('csrf-token', token, {
    httpOnly: false,  // クライアントJSから読み取り可能にする
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // strict だと厳しすぎるので lax に変更
    path: '/',
    maxAge: 10 * 60,  // 10分（短めに設定して鮮度を保つ）
  });

  return response;
}
