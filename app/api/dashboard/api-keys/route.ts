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

    // Edge Functionを呼び出してAPIキーを生成
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 401 }
      )
    }

    const { data: result, error: createError } = await supabase.functions.invoke('api-key-manager', {
      body: {
        action: 'rotate',
        key_name: name,
        tier: tier || 'free'
      }
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
      apiKey: result.apiKey,
      keyData: {
        id: result.keyId,
        name: result.name,
        tier: result.tier
      }
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

    // Edge Functionを呼び出してAPIキー一覧を取得
    const { data: result, error } = await supabase.functions.invoke('api-key-manager', {
      body: {
        action: 'list'
      }
    })

    if (error || !result?.success) {
      console.error('Failed to fetch API keys:', error)
      return NextResponse.json(
        { error: 'APIキーの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      apiKeys: result.keys || []
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

    // Edge Functionを呼び出してAPIキーを削除
    const { data: result, error } = await supabase.functions.invoke('api-key-manager', {
      body: {
        action: 'delete',
        key_id: keyId
      }
    })

    if (error || !result?.success) {
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