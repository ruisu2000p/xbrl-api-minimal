'use client'

import { useState, useEffect } from 'react'

interface UsageStats {
  total_requests: number
  requests_today: number
  requests_this_month: number
  rate_limit_remaining: number
  rate_limit_reset: string
}

interface ApiUsageStatsProps {
  apiKeyId?: string
}

export default function ApiUsageStats({ apiKeyId }: ApiUsageStatsProps) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [apiKeyId])

  const fetchStats = async () => {
    try {
      const url = apiKeyId
        ? `/api/dashboard/stats?apiKeyId=${apiKeyId}`
        : '/api/dashboard/stats'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const usagePercentage = stats.rate_limit_remaining > 0
    ? ((stats.requests_today / 10000) * 100).toFixed(1)
    : '100'

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">本日の使用回数</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.requests_today.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              / 10,000回
            </p>
          </div>
          <div className="text-blue-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                parseFloat(usagePercentage) > 80
                  ? 'bg-red-500'
                  : parseFloat(usagePercentage) > 60
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(parseFloat(usagePercentage), 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">{usagePercentage}% 使用中</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">今月の使用回数</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.requests_this_month.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              / 300,000回
            </p>
          </div>
          <div className="text-green-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">総リクエスト数</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_requests.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              全期間
            </p>
          </div>
          <div className="text-purple-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">レート制限</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.rate_limit_remaining > 0 ? '正常' : '制限中'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              リセット: {new Date(stats.rate_limit_reset).toLocaleTimeString('ja-JP')}
            </p>
          </div>
          <div className={stats.rate_limit_remaining > 0 ? 'text-green-500' : 'text-red-500'}>
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}