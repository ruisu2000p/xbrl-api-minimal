import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth'
import { generateApiKey } from '@/lib/supabase/auth'

// 料金プランごとのレート制限設定
const tierLimits = {
  free: { hourly: 100, daily: 1000, monthly: 10000 },
  basic: { hourly: 500, daily: 5000, monthly: 50000 },
  pro: { hourly: 2000, daily: 20000, monthly: 200000 },
  enterprise: { hourly: 10000, daily: 100000, monthly: 1000000 }
}

// APIキー一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAuthServerClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのAPIキー取得
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        api_key_rate_limits (
          requests_per_hour,
          requests_per_day,
          requests_per_month,
          current_hour_count,
          current_day_count,
          current_month_count
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // APIキーをマスク表示（最初と最後の文字のみ表示）
    const maskedKeys = apiKeys?.map(key => ({
      ...key,
      key_preview: key.name ? `${key.name.substring(0, 10)}...` : 'Hidden'
    }))

    return NextResponse.json({ apiKeys: maskedKeys })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// 新規APIキー生成
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAuthServerClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, tier = 'free' } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'API key name is required' }, { status: 400 })
    }

    // APIキー生成
    const { apiKey, keyHash } = generateApiKey('xbrl', tier)

    // トランザクション的に実行
    // 1. APIキーをDBに保存
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        key_hash: keyHash,
        user_id: user.id,
        name,
        description,
        tier,
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to create API key' }, { status: 500 })
    }

    // 2. レート制限設定を作成
    const limits = tierLimits[tier as keyof typeof tierLimits] || tierLimits.free
    const { error: rateLimitError } = await supabase
      .from('api_key_rate_limits')
      .insert({
        api_key_id: newKey.id,
        requests_per_hour: limits.hourly,
        requests_per_day: limits.daily,
        requests_per_month: limits.monthly
      })

    if (rateLimitError) {
      console.error('Error setting rate limits:', rateLimitError)
      // APIキーを削除してロールバック
      await supabase.from('api_keys').delete().eq('id', newKey.id)
      return NextResponse.json({ success: false, error: 'Failed to set rate limits' }, { status: 500 })
    }

    // 生成したAPIキーは一度だけ表示
    return NextResponse.json({ 
      apiKey,
      message: 'このAPIキーは二度と表示されません。安全に保管してください。',
      keyId: newKey.id,
      tier,
      limits
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// APIキー削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseAuthServerClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ success: false, error: 'API key ID is required' }, { status: 400 })
    }

    // 所有権確認と削除（RLSポリシーで保護）
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error revoking API key:', error)
      return NextResponse.json({ success: false, error: 'Failed to revoke API key' }, { status: 500 })
    }

    return NextResponse.json({ message: 'API key revoked successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}