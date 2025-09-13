import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

    const searchParams = request.nextUrl.searchParams
    const apiKeyId = searchParams.get('apiKeyId')

    // モックデータを返す（実際の実装では、使用ログテーブルから集計）
    const now = new Date()
    const stats = {
      total_requests: Math.floor(Math.random() * 50000) + 10000,
      requests_today: Math.floor(Math.random() * 5000) + 100,
      requests_this_month: Math.floor(Math.random() * 100000) + 5000,
      rate_limit_remaining: Math.floor(Math.random() * 9000) + 1000,
      rate_limit_reset: new Date(now.getTime() + 3600000).toISOString(), // 1時間後
    }

    // 実際の実装では、以下のようなクエリを実行
    /*
    if (apiKeyId) {
      // 特定のAPIキーの統計
      const { data: usageLogs } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())

      // 集計処理
    } else {
      // ユーザーのすべてのAPIキーの統計
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)

      // 各APIキーの使用状況を集計
    }
    */

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}