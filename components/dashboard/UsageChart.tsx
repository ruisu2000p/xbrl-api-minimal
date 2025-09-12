'use client'

import { useState, useEffect } from 'react'

export default function UsageChart() {
  const [period, setPeriod] = useState('7days')
  const [usageData, setUsageData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsageData()
  }, [period])

  const fetchUsageData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/usage?period=${period}`)
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">使用状況</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="24hours">過去24時間</option>
          <option value="7days">過去7日間</option>
          <option value="30days">過去30日間</option>
          <option value="90days">過去90日間</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : usageData ? (
        <div>
          {/* サマリー */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-900">{usageData.summary?.total || 0}</p>
              <p className="text-sm text-gray-600">総リクエスト</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{usageData.summary?.success || 0}</p>
              <p className="text-sm text-gray-600">成功</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-600">{usageData.summary?.errors || 0}</p>
              <p className="text-sm text-gray-600">エラー</p>
            </div>
          </div>

          {/* 簡易グラフ（時系列データ） */}
          {usageData.timeSeriesData && usageData.timeSeriesData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">時系列推移</h3>
              <div className="relative h-32 bg-gray-50 rounded p-2">
                <div className="flex items-end justify-between h-full">
                  {usageData.timeSeriesData.slice(-10).map((data: any, index: number) => {
                    const maxRequests = Math.max(...usageData.timeSeriesData.map((d: any) => d.requests))
                    const height = maxRequests > 0 ? (data.requests / maxRequests) * 100 : 0
                    
                    return (
                      <div
                        key={index}
                        className="flex-1 mx-1"
                        title={`${data.date}: ${data.requests}リクエスト`}
                      >
                        <div
                          className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* エンドポイント別統計 */}
          {usageData.endpointStats && usageData.endpointStats.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">よく使われるエンドポイント</h3>
              <div className="space-y-2">
                {usageData.endpointStats.slice(0, 5).map((stat: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate flex-1">{stat.endpoint}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-900 font-medium">{stat.count}回</span>
                      <span className="text-gray-500 text-xs">
                        平均 {Math.round(stat.avgResponseTime)}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">使用状況データがありません</p>
      )}
    </div>
  )
}