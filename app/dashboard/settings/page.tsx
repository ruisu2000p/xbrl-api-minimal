'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  name?: string
  company?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // フォームステート
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    newEmail: ''
  })

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const supabase = createSupabaseClient()

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/auth/login')
        return
      }

      setUser({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || '',
        company: user.user_metadata?.company || null
      })

      setFormData({
        name: user.user_metadata?.name || '',
        company: user.user_metadata?.company || '',
        newEmail: user.email || ''
      })
    } catch (err) {
      console.error('Error loading user profile:', err)
      setError('プロファイルの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    if (!user) return

    setUpdateLoading(true)
    setError('')
    setSuccess('')

    const supabase = createSupabaseClient()

    try {
      // プロファイル情報を更新
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          company: formData.company
        }
      })

      if (updateError) {
        throw updateError
      }

      setSuccess('プロファイルが更新されました')

      // ユーザー情報を再読み込み
      await loadUserProfile()
    } catch (err: any) {
      setError(err.message || 'プロファイルの更新に失敗しました')
    } finally {
      setUpdateLoading(false)
    }
  }

  const updateEmail = async () => {
    if (!user || !formData.newEmail) return
    if (formData.newEmail === user.email) {
      setError('現在のメールアドレスと同じです')
      return
    }

    setUpdateLoading(true)
    setError('')
    setSuccess('')

    const supabase = createSupabaseClient()

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.newEmail
      })

      if (error) {
        throw error
      }

      setSuccess('メールアドレス変更の確認メールを送信しました。メールをご確認ください。')
    } catch (err: any) {
      setError(err.message || 'メールアドレスの変更に失敗しました')
    } finally {
      setUpdateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">設定</h1>
              <p className="mt-1 text-sm text-gray-600">アカウント設定とプラン管理</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* プロファイル設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">プロファイル情報</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名前
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="お名前を入力してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社名（オプション）
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="会社名を入力してください"
              />
            </div>

            <button
              onClick={updateProfile}
              disabled={updateLoading}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                updateLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {updateLoading ? '更新中...' : 'プロファイルを更新'}
            </button>
          </div>
        </div>

        {/* メールアドレス変更 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">メールアドレス変更</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のメールアドレス
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいメールアドレス
              </label>
              <input
                type="email"
                value={formData.newEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, newEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="新しいメールアドレスを入力してください"
              />
            </div>

            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
              <p className="font-medium">⚠️ 注意事項</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>新しいメールアドレスに確認メールが送信されます</li>
                <li>確認メール内のリンクをクリックして変更を完了してください</li>
                <li>変更が完了するまで現在のメールアドレスでログインしてください</li>
              </ul>
            </div>

            <button
              onClick={updateEmail}
              disabled={updateLoading || !formData.newEmail || formData.newEmail === user?.email}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                updateLoading || !formData.newEmail || formData.newEmail === user?.email
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {updateLoading ? '送信中...' : 'メールアドレスを変更'}
            </button>
          </div>
        </div>

        {/* プラン管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">プラン管理</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">現在のプラン</h3>
                <p className="text-sm text-gray-600">無料プラン</p>
                <p className="text-xs text-gray-500 mt-1">
                  月間1,000リクエストまで利用可能
                </p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                アクティブ
              </span>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">プロプラン（準備中）</h3>
              <p className="text-sm text-blue-800 mb-3">
                より多くのリクエストと高度な機能をご利用いただけます。
              </p>
              <ul className="text-sm text-blue-700 space-y-1 mb-4">
                <li>• 月間10,000リクエスト</li>
                <li>• 優先サポート</li>
                <li>• 高度な分析機能</li>
                <li>• カスタムレポート</li>
              </ul>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
              >
                近日公開予定
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}