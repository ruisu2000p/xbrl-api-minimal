// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// シンプルなAPIキー生成（データベース不要版）
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得（オプション）
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // ボディがない場合は無視
    }

    const { name = 'Default API Key', email = 'user@example.com' } = body;

    // APIキーを生成
    const apiKey = `xbrl_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyId = crypto.randomBytes(8).toString('hex');
    
    // レスポンスデータ
    const response = {
      success: true,
      data: {
        id: keyId,
        name: name,
        key: apiKey,
        key_preview: `${apiKey.substring(0, 16)}...${apiKey.slice(-4)}`,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年後
        status: 'active',
        rate_limit: {
          requests_per_day: 100000,
          requests_per_hour: 10000,
          requests_per_minute: 100
        },
        usage: {
          today: 0,
          this_month: 0,
          total: 0
        }
      },
      message: 'APIキーが正常に生成されました。このキーは二度と表示されませんので、安全に保管してください。'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'APIキーの生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// APIキー情報の取得（ダミーデータ）
export async function GET(request: NextRequest) {
  try {
    // ダミーのAPIキー情報
    const apiKeys = [
      {
        id: '1',
        name: 'Production API Key',
        key_preview: 'xbrl_live_abc123...wxyz',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'active',
        usage: {
          today: 245,
          this_month: 5420,
          total: 15234
        }
      },
      {
        id: '2',
        name: 'Development API Key',
        key_preview: 'xbrl_live_dev456...mnop',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        usage: {
          today: 12,
          this_month: 234,
          total: 892
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: apiKeys,
      total: apiKeys.length
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'APIキー情報の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}