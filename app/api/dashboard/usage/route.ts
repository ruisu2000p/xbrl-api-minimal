import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAuthServerClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7days'
    const apiKeyId = searchParams.get('apiKeyId')

    // 期間の計算
    let startDate = new Date()
    switch (period) {
      case '24hours':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7days':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30days':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90days':
        startDate.setDate(startDate.getDate() - 90)
        break
    }

    // 基本クエリ構築
    let query = supabase
      .from('api_key_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // 特定のAPIキーでフィルタ
    if (apiKeyId) {
      query = query.eq('api_key_id', apiKeyId)
    } else {
      // ユーザーのすべてのAPIキーを取得
      const { data: userKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
      
      if (userKeys && userKeys.length > 0) {
        const keyIds = userKeys.map(k => k.id)
        query = query.in('api_key_id', keyIds)
      } else {
        return NextResponse.json({ 
          usage: [], 
          summary: { total: 0, success: 0, errors: 0 } 
        })
      }
    }

    const { data: usageLogs, error } = await query

    if (error) {
      console.error('Error fetching usage logs:', error)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    // 統計情報の計算
    const summary = {
      total: usageLogs?.length || 0,
      success: usageLogs?.filter(log => log.status_code >= 200 && log.status_code < 300).length || 0,
      errors: usageLogs?.filter(log => log.status_code >= 400).length || 0
    }

    // 時系列データの集計（グラフ用）
    const timeSeriesData = aggregateTimeSeriesData(usageLogs || [], period)

    // エンドポイント別の集計
    const endpointStats = aggregateEndpointStats(usageLogs || [])

    return NextResponse.json({
      usage: usageLogs,
      summary,
      timeSeriesData,
      endpointStats
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 時系列データの集計
function aggregateTimeSeriesData(logs: any[], period: string) {
  const interval = period === '24hours' ? 'hour' : 'day'
  const dataMap = new Map<string, { requests: number; success: number; errors: number }>()

  logs.forEach(log => {
    const date = new Date(log.created_at)
    const key = interval === 'hour' 
      ? `${date.toISOString().split('T')[0]} ${date.getHours()}:00`
      : date.toISOString().split('T')[0]

    if (!dataMap.has(key)) {
      dataMap.set(key, { requests: 0, success: 0, errors: 0 })
    }

    const stats = dataMap.get(key)!
    stats.requests++
    if (log.status_code >= 200 && log.status_code < 300) {
      stats.success++
    } else if (log.status_code >= 400) {
      stats.errors++
    }
  })

  return Array.from(dataMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// エンドポイント別の集計
function aggregateEndpointStats(logs: any[]) {
  const endpointMap = new Map<string, { count: number; avgResponseTime: number }>()

  logs.forEach(log => {
    const endpoint = log.endpoint || 'unknown'
    
    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, { count: 0, avgResponseTime: 0 })
    }

    const stats = endpointMap.get(endpoint)!
    const prevTotal = stats.avgResponseTime * stats.count
    stats.count++
    stats.avgResponseTime = (prevTotal + (log.response_time_ms || 0)) / stats.count
  })

  return Array.from(endpointMap.entries())
    .map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10エンドポイント
}