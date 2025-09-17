import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { UnifiedAuthManager } from '@/lib/security/auth-manager'

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

    const rateLimits = {
      perMinute: tier === 'pro' ? 600 : tier === 'basic' ? 300 : 100,
      perHour: tier === 'pro' ? 10000 : tier === 'basic' ? 5000 : 2000,
      perDay: tier === 'pro' ? 200000 : tier === 'basic' ? 100000 : 50000
    }

    const { apiKey, record } = await UnifiedAuthManager.createApiKey(
      user.id,
      name,
      {
        tier,
        status: 'active',
        metadata: {
          created_via: 'dashboard',
          created_at: new Date().toISOString()
        },
        rateLimits,
        description,
        extraFields: {
          description,
          created_by: user.id
        }
      }
    )

    return NextResponse.json({
      success: true,
      apiKey,
      keyData: record
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