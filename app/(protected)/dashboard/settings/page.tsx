'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/SupabaseProvider'

interface UserProfile {
  id: string
  email: string
  name?: string
  company?: string | null
}

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  requests_per_hour: number
  requests_per_day: number
  requests_per_month: number
  features: any
  is_active: boolean
  display_order: number
}

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  subscription_plans?: SubscriptionPlan
}

export default function SettingsPage() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // フォームステート
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    newEmail: ''
  })

  useEffect(() => {
    loadUserProfile()
    loadSubscriptionData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUserProfile = async () => {
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

    // メールアドレスのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.newEmail)) {
      setError('正しいメールアドレス形式を入力してください')
      return
    }

    setUpdateLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.newEmail
      })

      if (error) {
        throw error
      }

      setSuccess('メールアドレス変更の確認メールを送信しました。新しいメールアドレスに届いた確認リンクをクリックして変更を完了してください。')

      // 成功後は入力フィールドをリセット
      setFormData(prev => ({ ...prev, newEmail: '' }))
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setError('このメールアドレスは既に使用されています')
      } else {
        setError(err.message || 'メールアドレスの変更に失敗しました')
      }
    } finally {
      setUpdateLoading(false)
    }
  }

  const loadSubscriptionData = async () => {
    try {
      // プラン一覧を取得
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (plansError) throw plansError
      setPlans(plansData || [])

      // ユーザーの現在のサブスクリプションを取得
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('user_id', user.id)
          .single()

        if (subData && !subError) {
          setCurrentSubscription(subData)
          setSelectedPlan(subData.plan_id)
        } else {
          // サブスクリプションがない場合は無料プランを選択
          const freePlan = plansData?.find((p: SubscriptionPlan) => p.name === 'Free')
          if (freePlan) {
            setSelectedPlan(freePlan.id)
          }
        }
      }
    } catch (err) {
      console.error('Error loading subscription data:', err)
    }
  }

  const updateSubscription = async () => {
    if (!selectedPlan || !user) return

    setUpdateLoading(true)
    setError('')
    setSuccess('')

    try {
      if (currentSubscription) {
        // 既存のサブスクリプションを更新
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: selectedPlan,
            billing_cycle: billingCycle,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // 新規サブスクリプションを作成
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_id: selectedPlan,
            billing_cycle: billingCycle,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })

        if (error) throw error
      }

      setSuccess('プランが更新されました')
      await loadSubscriptionData()
    } catch (err: any) {
      setError(err.message || 'プランの更新に失敗しました')
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

          {/* 現在のプラン */}
          {currentSubscription && currentSubscription.subscription_plans && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">
                    現在のプラン: {currentSubscription.subscription_plans.name}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {currentSubscription.billing_cycle === 'monthly' ? '月額' : '年額'}プラン
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    • {currentSubscription.subscription_plans.requests_per_month.toLocaleString()}リクエスト/月
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  {currentSubscription.status === 'active' ? 'アクティブ' : currentSubscription.status}
                </span>
              </div>
            </div>
          )}

          {/* 課金サイクル選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              課金サイクル
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md font-medium ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                月額
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md font-medium ${
                  billingCycle === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                年額（お得！）
              </button>
            </div>
          </div>

          {/* プラン一覧 */}
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
              const isCurrentPlan = currentSubscription?.plan_id === plan.id
              const isSelected = selectedPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        現在のプラン
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

                  <div className="mb-3">
                    <span className="text-2xl font-bold">
                      ¥{price.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">
                      /{billingCycle === 'monthly' ? '月' : '年'}
                    </span>
                  </div>

                  <ul className="text-sm space-y-1 mb-4">
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {plan.requests_per_month.toLocaleString()}リクエスト/月
                    </li>
                    {plan.features?.support && (
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {plan.features.support === 'community' && 'コミュニティサポート'}
                        {plan.features.support === 'email' && 'メールサポート'}
                        {plan.features.support === 'priority' && '優先サポート'}
                        {plan.features.support === 'dedicated' && '専任サポート'}
                      </li>
                    )}
                    {plan.features?.data_export && (
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        データエクスポート
                      </li>
                    )}
                    {plan.features?.custom_reports && (
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        カスタムレポート
                      </li>
                    )}
                  </ul>

                  <div className="flex items-center justify-center">
                    <input
                      type="radio"
                      name="plan"
                      checked={isSelected}
                      onChange={() => setSelectedPlan(plan.id)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">
                      {isCurrentPlan ? '選択中' : '選択'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* プラン更新ボタン */}
          <div className="mt-6">
            <button
              onClick={updateSubscription}
              disabled={updateLoading || selectedPlan === currentSubscription?.plan_id}
              className={`w-full px-6 py-3 rounded-md text-white font-medium ${
                updateLoading || selectedPlan === currentSubscription?.plan_id
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {updateLoading ? '更新中...' : 'プランを変更'}
            </button>

            {selectedPlan === currentSubscription?.plan_id && (
              <p className="text-sm text-gray-500 text-center mt-2">
                既に選択されているプランです
              </p>
            )}
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800 mb-2">プラン変更に関する注意事項</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• プラン変更は即時反映されます</li>
              <li>• ダウングレードした場合、現在の請求期間が終了するまで現在のプランの機能を利用できます</li>
              <li>• アップグレードした場合、差額が日割り計算されます</li>
              <li>• 決済処理は現在準備中のため、実際の課金は発生しません</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}