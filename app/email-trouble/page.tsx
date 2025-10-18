'use client'

import { useEffect, useState } from 'react'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { useRouter } from 'next/navigation'

type EmailStatus = 'unknown' | 'verified' | 'bounced' | 'complained'

export default function EmailTroublePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string>('')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('unknown')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newEmail, setNewEmail] = useState('')
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

      // プロフィールから email_status を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_status')
        .eq('id', user.id)
        .single()

      if (profile) {
        setEmailStatus(profile.email_status as EmailStatus)
      }

      // email_status が正常な場合はダッシュボードへ
      if (profile && profile.email_status !== 'bounced' && profile.email_status !== 'complained') {
        router.push('/dashboard')
        return
      }

      setEmail(user.email || '')
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage(null)

    try {
      const supabase = supabaseManager.getBrowserClient()

      // メールアドレスを更新（Supabaseは自動的に確認メールを送信）
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (error) {
        setMessage({
          type: 'error',
          text: 'メールアドレスの更新に失敗しました。有効なメールアドレスを入力してください。'
        })
      } else {
        setMessage({
          type: 'success',
          text: '確認メールを送信しました。新しいメールアドレスで確認リンクをクリックしてください。'
        })
        setNewEmail('')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'エラーが発生しました。しばらくしてから再度お試しください。'
      })
    } finally {
      setUpdating(false)
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

  const statusInfo = {
    bounced: {
      title: 'メール配信エラー',
      icon: '⚠️',
      description: 'お客様のメールアドレスにメールが配信できませんでした。',
      reason: 'メールアドレスが存在しないか、メールボックスが満杯の可能性があります。'
    },
    complained: {
      title: 'スパム報告',
      icon: '🚫',
      description: 'お客様のメールアドレスから当サービスのメールがスパムとして報告されました。',
      reason: 'メールクライアントでスパム報告された可能性があります。'
    }
  }

  const currentStatus = emailStatus === 'bounced' ? statusInfo.bounced : statusInfo.complained

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* アイコン */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{currentStatus.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900">{currentStatus.title}</h1>
        </div>

        {/* 説明 */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">{currentStatus.description}</p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>現在のメールアドレス:</strong>
            </p>
            <p className="text-sm text-yellow-900 font-medium mt-1">{email}</p>
          </div>

          <p className="text-sm text-gray-600 mb-4">{currentStatus.reason}</p>

          <p className="text-gray-700">
            サービスを引き続きご利用いただくには、有効なメールアドレスに更新してください。
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

        {/* メールアドレス更新フォーム */}
        <form onSubmit={handleUpdateEmail} className="mb-6">
          <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-2">
            新しいメールアドレス
          </label>
          <input
            type="email"
            id="newEmail"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            placeholder="new-email@example.com"
          />

          <button
            type="submit"
            disabled={updating || !newEmail}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {updating ? '更新中...' : 'メールアドレスを更新'}
          </button>
        </form>

        {/* ログアウトボタン */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          ログアウト
        </button>

        {/* 補足情報 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            メールアドレスの更新後、確認メールが送信されます。<br />
            確認が完了すると、サービスをご利用いただけます。
          </p>
        </div>
      </div>
    </div>
  )
}
