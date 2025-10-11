'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { useSupabase } from '@/components/SupabaseProvider'

interface ApiKey {
  id: string
  name: string
  description?: string
  status: string
  tier?: string
  created_at: string
  last_used_at: string | null
  key_hash: string
  masked_key?: string | null
  expires_at?: string | null
}

interface DashboardClientProps {
  user: {
    id: string
    email: string
    name?: string
    company?: string | null
  }
  apiKeys: ApiKey[]
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
  plan_id: string // UUID of the plan
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  subscription_plans?: SubscriptionPlan
}

interface Invoice {
  id: string
  stripe_invoice_id: string
  stripe_subscription_id: string
  amount_due: number
  amount_paid: number
  currency: string
  status: string
  invoice_pdf: string | null
  hosted_invoice_url: string | null
  billing_reason: string
  period_start: string
  period_end: string
  created_at: string
  paid_at: string | null
}

export default function DashboardClient({ user, apiKeys }: DashboardClientProps) {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [isGenerating, setIsGenerating] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyDescription, setKeyDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'api' | 'account' | 'plan' | 'billing'>('api')

  // アカウント設定用
  const [formData, setFormData] = useState({
    name: user.name || '',
    company: user.company || '',
    newEmail: user.email
  })
  const [updateLoading, setUpdateLoading] = useState(false)

  // プラン管理用
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // 請求管理用
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  useEffect(() => {
    loadSubscriptionData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'billing') {
      loadInvoices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleGenerateKey = async () => {
    if (!keyName) {
      setError('APIキー名を入力してください')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('認証が必要です')
        return
      }

      // Supabase Edge Functionを呼び出す
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/keys_issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: keyName,
          description: keyDescription,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.api_key) {
          setGeneratedKey(data.api_key)
          setShowKeyModal(true)
        }
        setKeyName('')
        setKeyDescription('')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'APIキーの生成に失敗しました')
      }
    } catch (err) {
      setError('エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('このAPIキーを削除してもよろしいですか？')) {
      return
    }

    try {
      // APIキーを無効化（削除はせずにステータスを変更）
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false, status: 'revoked' })
        .eq('id', keyId)
        .eq('user_id', user.id)

      if (!error) {
        router.refresh()
      } else {
        console.error('Delete error:', error)
        setError('APIキーの削除に失敗しました')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('エラーが発生しました')
    }
  }

  const handleSignOut = async () => {
    await signOut()
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
    } catch (err) {
      console.error('Error loading subscription data:', err)
    }
  }

  const loadInvoices = async () => {
    setInvoicesLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('認証が必要です')
        return
      }

      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        const data = await response.json()
        setError(data.error || '請求書の取得に失敗しました')
      }
    } catch (err) {
      console.error('Error loading invoices:', err)
      setError('エラーが発生しました')
    } finally {
      setInvoicesLoading(false)
    }
  }

  const updateProfile = async () => {
    setUpdateLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          company: formData.company
        }
      })

      if (updateError) throw updateError
      setSuccess('プロファイルが更新されました')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'プロファイルの更新に失敗しました')
    } finally {
      setUpdateLoading(false)
    }
  }

  const updateEmail = async () => {
    if (!formData.newEmail || formData.newEmail === user.email) {
      setError('現在のメールアドレスと同じです')
      return
    }

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

      if (error) throw error
      setSuccess('メールアドレス変更の確認メールを送信しました。新しいメールアドレスに届いた確認リンクをクリックして変更を完了してください。')
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

  const updateSubscription = async () => {
    if (!selectedPlan) return

    setUpdateLoading(true)
    setError('')
    setSuccess('')

    try {
      if (currentSubscription) {
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
      console.error('Subscription update error:', err)
      setError(err.message || 'プランの更新に失敗しました')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* APIキー表示モーダル */}
      {showKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold mb-4">APIキーが生成されました</h3>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ このAPIキーは二度と表示されません。今すぐ安全な場所にコピーしてください。
            </p>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all mb-4">
              {generatedKey}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey)
                  alert('APIキーをクリップボードにコピーしました')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                コピー
              </button>
              <button
                onClick={() => {
                  setShowKeyModal(false)
                  setGeneratedKey(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">XBRL API Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">APIキー管理</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('api')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              APIキー管理
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'account'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              アカウント設定
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plan'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              プラン管理
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'billing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              請求履歴
            </button>
          </nav>
        </div>

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

        {/* APIキー管理タブ */}
        {activeTab === 'api' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">新しいAPIキーを生成</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKeyName" className="block text-sm font-medium text-gray-700 mb-1">APIキー名</label>
              <input
                id="apiKeyName"
                name="apiKeyName"
                type="text"
                placeholder="APIキー名（例：本番用キー）"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="apiKeyDescription" className="block text-sm font-medium text-gray-700 mb-1">説明（オプション）</label>
              <textarea
                id="apiKeyDescription"
                name="apiKeyDescription"
                placeholder="説明（オプション）"
                value={keyDescription}
                onChange={(e) => setKeyDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <button
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '生成中...' : 'APIキーを生成'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">APIキー一覧</h2>
          </div>
          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{key.name}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {key.status === 'active' ? '有効' : '無効'}
                      </span>
                      {key.tier && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {key.tier}
                        </span>
                      )}
                    </div>
                    {key.description && (
                      <p className="text-sm text-gray-600 mt-1">{key.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2 font-mono">
                      ID: {key.id.substring(0, 8)}...{key.id.substring(key.id.length - 4)}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}</span>
                      {key.last_used_at && (
                        <span>最終使用: {new Date(key.last_used_at).toLocaleDateString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-md"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <p>まだAPIキーがありません</p>
              <p className="mt-2 text-sm">上のボタンから新しいキーを生成してください</p>
            </div>
          )}
        </div>

        {/* MCP接続案内 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">🔌 MCP (Model Context Protocol) 接続</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <p>Claude DesktopからこのAPIに接続して、財務データを直接取得できます。</p>

            <div className="bg-white rounded p-4 border border-blue-200">
              <p className="font-semibold mb-2">設定手順:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Claude Desktopの設定ファイルを開く</li>
                <li>以下のMCPサーバー設定を追加:</li>
              </ol>

              <div className="mt-3 bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                <pre>{`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"],
      "env": {
        "XBRL_API_KEY": "あなたのAPIキー",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}`}</pre>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-semibold mb-2">利用可能な機能:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>企業検索（4,231社）</li>
                <li>財務データ取得（売上高、利益、キャッシュフロー等）</li>
                <li>有価証券報告書の全文検索</li>
                <li>年度別データ比較（2015-2025年）</li>
              </ul>
            </div>
          </div>
        </div>
          </>
        )}

        {/* アカウント設定タブ */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* プロファイル設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">プロファイル情報</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="profileUserName" className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                  <input
                    id="profileUserName"
                    name="profileUserName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="お名前を入力してください"
                  />
                </div>
                <div>
                  <label htmlFor="profileCompanyName" className="block text-sm font-medium text-gray-700 mb-1">会社名（オプション）</label>
                  <input
                    id="profileCompanyName"
                    name="profileCompanyName"
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
                    updateLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {updateLoading ? '更新中...' : 'プロファイルを更新'}
                </button>
              </div>
            </div>

            {/* メールアドレス変更 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">メールアドレス変更</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentEmailAddress" className="block text-sm font-medium text-gray-700 mb-1">現在のメールアドレス</label>
                  <input
                    id="currentEmailAddress"
                    name="currentEmailAddress"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="newEmailAddress" className="block text-sm font-medium text-gray-700 mb-1">新しいメールアドレス</label>
                  <input
                    id="newEmailAddress"
                    name="newEmailAddress"
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
                  </ul>
                </div>
                <button
                  onClick={updateEmail}
                  disabled={updateLoading || !formData.newEmail || formData.newEmail === user.email}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    updateLoading || !formData.newEmail || formData.newEmail === user.email
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {updateLoading ? '送信中...' : 'メールアドレスを変更'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* プラン管理タブ */}
        {activeTab === 'plan' && (
          <div className="space-y-8">
            {/* 現在のプラン */}
            {currentSubscription && currentSubscription.subscription_plans && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">課金サイクル</label>
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
                const isFree = plan.name === 'Free'
                const isPro = plan.name === 'Basic' // Basicが2980円のプラン

                // フリーまたはBasicプランのみ表示
                if (!isFree && !isPro) return null

                const isCurrentPlan = currentSubscription?.plan_id === plan.id
                const isSelected = selectedPlan === plan.id

                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
                      isSelected
                        ? isPro ? 'border-purple-500 bg-purple-50' : 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          おすすめ
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {isFree ? 'フリーミアムプラン' : 'プロフェッショナルプラン'}
                      </h3>
                      {isCurrentPlan && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          現在のプラン
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {isFree ? '個人投資家や学生向けの基本機能' : 'プロ投資家・研究者向け'}
                    </p>
                    <div className="mb-3">
                      <span className="text-2xl font-bold">
                        ¥{billingCycle === 'monthly' ? plan.price_monthly.toLocaleString() : plan.price_yearly.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/{billingCycle === 'monthly' ? '月' : '年'}</span>
                    </div>
                    <ul className="text-sm space-y-1 mb-4">
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isFree ? '100社の財務データアクセス' : '全5,220社の財務データ'}
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        APIコール無制限
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isFree ? '最新1期分のデータ' : '過去10年分のデータ'}
                      </li>
                      {isPro && (
                        <li className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          優先サポート
                        </li>
                      )}
                    </ul>
                    <div className="flex items-center justify-center">
                      <input
                        id={`plan-${plan.id}`}
                        name="plan"
                        type="radio"
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
            <div>
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
          </div>
        )}

        {/* 請求履歴タブ */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">請求履歴</h2>

              {invoicesLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          請求日
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          期間
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          アクション
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(invoice.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invoice.period_start).toLocaleDateString('ja-JP')} -{' '}
                            {new Date(invoice.period_end).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            ¥{(invoice.amount_paid / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'open'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invoice.status === 'paid'
                                ? '支払済'
                                : invoice.status === 'open'
                                ? '未払い'
                                : invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              {invoice.invoice_pdf && (
                                <a
                                  href={invoice.invoice_pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  PDF
                                </a>
                              )}
                              {invoice.hosted_invoice_url && (
                                <a
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  詳細
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">請求履歴がありません</p>
                  <p className="text-sm text-gray-400 mt-2">
                    サブスクリプションに登録すると、請求履歴が表示されます
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}