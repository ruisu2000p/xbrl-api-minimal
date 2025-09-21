/**
 * Health Check API Test
 * テスト対象: app/api/health/route.ts
 */

import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET()

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      version: expect.any(String)
    })
  })

  it('should include current timestamp', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET()
    const data = await response.json()

    const timestamp = new Date(data.timestamp)
    const now = new Date()
    
    // タイムスタンプが現在時刻の1秒以内であることを確認
    expect(Math.abs(timestamp.getTime() - now.getTime())).toBeLessThan(1000)
  })

  it('should handle missing dependencies gracefully', async () => {
    // 環境変数を一時的に削除
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await GET()

    // ステータスコードが503（Service Unavailable）であることを確認
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')

    // 環境変数を復元
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
  })
})