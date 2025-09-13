'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpWithEmail } from '@/lib/auth'

const plans = [
  { value: 'free', label: '無料プラン', description: 'ベーシックアクセス' },
  { value: 'basic', label: 'Basic', description: '標準アクセス' },
  { value: 'pro', label: 'Pro', description: 'プロフェッショナルアクセス' },
  { value: 'enterprise', label: 'Enterprise', description: 'エンタープライズアクセス' }
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    plan: 'free'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setDebugInfo(null)
    setLoading(true)

    // バリデーション
    if (!formData.email || !formData.password) {
      setError('メールアドレスとパスワードは必須です')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      setLoading(false)
      return
    }

    try {
      // デバッグ情報を設定
      const debugData = {
        timestamp: new Date().toISOString(),
        email: formData.email,
        plan: formData.plan,
        company: formData.companyName || 'なし'
      }

      // Supabase Authを使用して直接登録
      const result = await signUpWithEmail(
        formData.email,
        formData.password,
        {
          company_name: formData.companyName,
          plan: formData.plan
        }
      )

      // デバッグ情報を更新
      const debugResult = {
        ...debugData,
        userCreated: !!result.data?.user,
        userId: result.data?.user?.id || 'なし',
        sessionCreated: !!result.data?.session,
        hasSession: !!result.data?.session,
        errorMessage: result.error?.message || 'なし',
        errorDetails: (result.error as any)?.details || 'なし',
        errorOriginal: (result.error as any)?.originalMessage || 'なし',
        isExistingUser: !!(result as any).isExistingUser,
        autoSignedIn: !!(result as any).autoSignedIn,
        requiresEmailConfirmation: !!(result as any).requiresEmailConfirmation,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }

      setDebugInfo(JSON.stringify(debugResult, null, 2))

      if (result.error) {
        setError(result.error.message)
        setLoading(false)
      } else if (result.data?.user) {
        // 既存ユーザーとしてログイン成功
        if ((result as any).isExistingUser) {
          setLoading(false)
          setSuccessMessage('既存のアカウントでログインしました。ダッシュボードへリダイレクトします...')
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
          return
        }

        // 新規登録成功 - すべての成功ケースで待機処理を行う
        setLoading(false)
        setSuccessMessage('登録処理中です... しばらくお待ちください')

        // Supabaseへの登録とセッション確立を待つ（3秒）
        setTimeout(() => {
          setSuccessMessage('登録が完了しました！ダッシュボードへ移動します...')

          // さらに1秒待ってからリダイレクト
          setTimeout(() => {
            // 強制的にページをリロードしてセッションを更新
            window.location.href = '/dashboard'
          }, 1000)
        }, 3000)
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || '不明なエラー'
      setError(`登録中にエラーが発生しました: ${errorMessage}`)
      setDebugInfo(JSON.stringify({
        error: errorMessage,
        stack: err?.stack || 'なし',
        timestamp: new Date().toISOString()
      }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          XBRL API アカウント作成
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          日本企業の財務データにアクセス
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} method="POST" action="#">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                {successMessage}
              </div>
            )}

            {debugInfo && (
              <details className="bg-gray-100 border border-gray-300 rounded p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  デバッグ情報（クリックで展開）
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                  {debugInfo}
                </pre>
              </details>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">8文字以上で入力してください</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                会社名（任意）
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                プラン選択
              </label>
              <select
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {plans.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label} - {plan.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                後からダッシュボードで変更可能です
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {loading ? '登録中...' : 'アカウント作成'}
              </button>
            </div>

            <div className="text-sm text-center">
              <span className="text-gray-600">既にアカウントをお持ちの方は</span>{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                ログイン
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}