import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseManager.createSSRClient()

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

    // Supabase Admin クライアントでbcrypt APIキーを生成
    const supabaseAdmin = await supabaseManager.createAdminSSRClient()

    // Supabaseの関数でAPIキーを生成（bcrypt版）
    const { data: result, error: createError } = await supabaseAdmin
      .rpc('create_api_key_bcrypt', {
        p_user_id: user.id,
        p_name: name,
        p_description: description,
        p_tier: tier
      })

    if (createError || !result?.success) {
      console.error('Failed to create API key:', createError)
      return NextResponse.json(
        { error: 'APIキーの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 生成されたキーを返す（この時だけ平文で返す）
    return NextResponse.json({
      success: true,
      apiKey: result.api_key,
      keyData: result.key_info
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
    const supabase = await supabaseManager.createSSRClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabaseAdmin = await supabaseManager.createAdminSSRClient()

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
    const supabase = await supabaseManager.createSSRClient()

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

    const supabaseAdmin = await supabaseManager.createAdminSSRClient()

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