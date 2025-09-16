import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/apiKey'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, tier = 'free' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'APIキー名は必須です' },
        { status: 400 }
      )
    }

    // 新しいAPIキーを生成
    const apiKey = generateApiKey('xbrl_live')
    const keyHash = hashApiKey(apiKey)
    const keyPrefix = extractApiKeyPrefix(apiKey)
    const keySuffix = extractApiKeySuffix(apiKey)

    // Supabase Admin クライアントでAPIキーを保存
    const supabaseAdmin = await createSupabaseServerAdminClient()

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        description,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        masked_key: maskApiKey(apiKey),
        tier,
        status: 'active',
        is_active: true,
        rate_limit_per_minute: tier === 'pro' ? 600 : tier === 'basic' ? 300 : 100,
        rate_limit_per_hour: tier === 'pro' ? 10000 : tier === 'basic' ? 5000 : 2000,
        rate_limit_per_day: tier === 'pro' ? 200000 : tier === 'basic' ? 100000 : 50000,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create API key:', insertError)
      return NextResponse.json(
        { error: 'APIキーの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 生成されたキーを返す（この時だけ平文で返す）
    return NextResponse.json({
      success: true,
      apiKey,
      keyData: newKey
    })

  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabaseAdmin = await createSupabaseServerAdminClient()

    // ユーザーのAPIキーを取得
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch API keys:', error)
      return NextResponse.json(
        { error: 'APIキーの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      apiKeys: apiKeys || []
    })

  } catch (error) {
    console.error('API keys fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json(
        { error: 'APIキーIDが必要です' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createSupabaseServerAdminClient()

    // APIキーを無効化（削除ではなくstatusを変更）
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to revoke API key:', error)
      return NextResponse.json(
        { error: 'APIキーの無効化に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'APIキーを無効化しました'
    })

  } catch (error) {
    console.error('API key deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}