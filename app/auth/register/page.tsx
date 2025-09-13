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
      // Supabase Authを使用して直接登録
      const result = await signUpWithEmail(
        formData.email,
        formData.password,
        {
          company_name: formData.companyName,
          plan: formData.plan
        }
      )

      if (result.error) {
        setError(result.error.message)
        setLoading(false)
        return
      }

      // 登録成功
      if (result.data?.user) {
        setLoading(false)

        // セッションがある場合（メール確認OFF時）
        if (result.data?.session) {
          setSuccessMessage('登録が完了しました！ダッシュボードへ移動します...')
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // メール確認が必要な場合
          setSuccessMessage('登録が完了しました！確認メールをご確認ください。')
        }
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