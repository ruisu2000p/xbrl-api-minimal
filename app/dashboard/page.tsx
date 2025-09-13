'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth'
import dynamic from 'next/dynamic'

// 動的インポートでコンポーネントエラーを回避
const ApiKeyManager = dynamic(() => import('@/components/dashboard/ApiKeyManager'), { 
  ssr: false,
  loading: () => <div>APIキー管理を読み込み中...</div>
})
const UsageChart = dynamic(() => import('@/components/dashboard/UsageChart'), { 
  ssr: false,
  loading: () => <div>使用状況グラフを読み込み中...</div>
})
const PlanInfo = dynamic(() => import('@/components/dashboard/PlanInfo'), { 
  ssr: false,
  loading: () => <div>プラン情報を読み込み中...</div>
})

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          // 認証がない場合はログインページへ
          router.push('/auth/login?redirect=/dashboard')
          return
        }
        setUser(currentUser)
      } catch (error) {
        // エラーの場合もログインページへ
        router.push('/auth/login?redirect=/dashboard')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])


  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* プラン情報 */}
          <div className="lg:col-span-1">
            <PlanInfo />
          </div>

          {/* APIキー管理 */}
          <div className="lg:col-span-2">
            <ApiKeyManager />
          </div>

          {/* 使用状況グラフ */}
          <div className="lg:col-span-3">
            <UsageChart />
          </div>
        </div>
      </main>
    </div>
  )
}