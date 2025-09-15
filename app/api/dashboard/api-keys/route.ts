import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// APIキー生成関数
function generateApiKey(): string {
  const prefix = 'xbrl_'
  const randomBytes = crypto.randomBytes(32).toString('base64url')
  return `${prefix}${randomBytes}`
}

// APIキーのハッシュ化
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

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
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)

    // Supabase Admin クライアントでAPIキーを保存
    const supabaseAdmin = await createSupabaseServerAdminClient()

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        description,
        key_hash: keyHash,
        tier,
        status: 'active',
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