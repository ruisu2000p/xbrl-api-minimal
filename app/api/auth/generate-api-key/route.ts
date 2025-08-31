// APIキー生成専用エンドポイント
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

// Supabase Admin Client
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
) : null;

// APIキーの生成
function generateApiKey(): string {
  const prefix = 'xbrl_live_';
  const randomPart = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '');
  return prefix + randomPart;
}

// APIキーのハッシュ化
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, plan = 'beta' } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'ユーザー情報が不足しています' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase接続エラー: 環境変数が設定されていません' },
        { status: 500 }
      );
    }

    // 既存のアクティブなAPIキーを確認
    const { data: existingKeys, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Fetch API keys error:', fetchError);
    }

    // 既にAPIキーがある場合は新規作成しない
    if (existingKeys && existingKeys.length > 0) {
      return NextResponse.json({
        success: false,
        message: '既にAPIキーが存在します',
        hasExistingKey: true,
        keyInfo: {
          prefix: existingKeys[0].key_prefix,
          createdAt: existingKeys[0].created_at
        }
      }, { status: 200 });
    }

    // 新しいAPIキーを生成
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 16);
    const keySuffix = apiKey.slice(-4);

    // APIキーをデータベースに保存
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Default API Key',
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        key_hash: keyHash,
        is_active: true,
        status: 'active',
        environment: 'production',
        created_by: userId,
        tier: plan === 'pro' ? 'pro' : plan === 'basic' ? 'basic' : 'free',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        rate_limit_per_minute: 60,
        rate_limit_per_hour: 1000,
        rate_limit_per_day: plan === 'pro' ? 10000 : plan === 'basic' ? 5000 : 1000
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('API key creation error:', apiKeyError);
      
      // エラーの詳細を返す
      return NextResponse.json({
        success: false,
        error: 'APIキーの作成に失敗しました',
        details: apiKeyError.message,
        code: apiKeyError.code
      }, { status: 500 });
    }

    console.log('✅ API key generated successfully:', {
      email,
      userId,
      keyPrefix
    });

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'APIキーが正常に生成されました',
      apiKey, // 平文のAPIキー（初回のみ）
      keyInfo: {
        prefix: keyPrefix,
        suffix: keySuffix,
        expiresAt: apiKeyData.expires_at,
        rateLimit: apiKeyData.rate_limit_per_day
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Generate API key error:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// APIキー情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'ユーザーIDが必要です' },
      { status: 400 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase接続エラー' },
      { status: 500 }
    );
  }

  // ユーザーのAPIキー情報を取得
  const { data: apiKeys, error } = await supabaseAdmin
    .from('api_keys')
    .select('key_prefix, key_suffix, name, is_active, created_at, expires_at, rate_limit_per_day')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    return NextResponse.json(
      { error: 'APIキー情報の取得に失敗しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hasApiKey: apiKeys && apiKeys.length > 0,
    apiKeys: apiKeys?.map(k => ({
      display: `${k.key_prefix}...${k.key_suffix}`,
      name: k.name,
      active: k.is_active,
      createdAt: k.created_at,
      expiresAt: k.expires_at,
      rateLimit: k.rate_limit_per_day
    }))
  }, { status: 200 });
}