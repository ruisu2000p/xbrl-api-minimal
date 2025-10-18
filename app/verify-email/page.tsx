'use client'

import { useEffect, useState } from 'react'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function checkUser() {
      const supabase = supabaseManager.getBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // ユーザーがいない場合はログインページへ
        router.push('/login')
        return
      }

      if (user.email_confirmed_at) {
        // メール確認済みの場合はダッシュボードへ
        router.push('/dashboard')
        return
      }

      setEmail(user.email || '')
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleResendEmail = async () => {
    setResending(true)
    setMessage(null)

    try {
      const supabase = supabaseManager.getBrowserClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setMessage({
          type: 'error',
          text: '確認メールの再送信に失敗しました。しばらくしてから再度お試しください。'
        })
      } else {
        setMessage({
          type: 'success',
          text: '確認メールを再送信しました。受信トレイをご確認ください。'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'エラーが発生しました。しばらくしてから再度お試しください。'
      })
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = supabaseManager.getBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* アイコン */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">メールアドレスの確認</h1>
        </div>

        {/* メッセージ */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            ご登録ありがとうございます。
          </p>
          <p className="text-gray-700 mb-4">
            以下のメールアドレス宛に確認メールを送信しました：
          </p>
          <p className="text-center font-medium text-blue-600 bg-blue-50 rounded px-4 py-2 mb-4">
            {email}
          </p>
          <p className="text-gray-700 mb-2">
            メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
          <p className="text-sm text-gray-600">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {resending ? '送信中...' : '確認メールを再送信'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* 補足情報 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            確認メールのリンクは24時間有効です。<br />
            有効期限が切れた場合は、再度確認メールを送信してください。
          </p>
        </div>
      </div>
    </div>
  )
}
