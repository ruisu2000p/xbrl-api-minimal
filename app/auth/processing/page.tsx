'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('登録処理中です...')
  const [dots, setDots] = useState('')
  const next = searchParams.get('next') || '/dashboard'

  useEffect(() => {
    // ドットアニメーション
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // セッション交換を試みる
    const handleAuth = async () => {
      const supabase = supabaseManager.getAnonClient()

      // URLにコードが含まれている場合、セッション交換を試みる
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)

      if (hashParams.get('access_token') || queryParams.get('code')) {
        setMessage('認証情報を確認しています...')

        // セッション交換を試みる
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (!error) {
            setMessage('認証に成功しました！ダッシュボードへ移動します...')
            setTimeout(() => {
              router.replace(next)
            }, 1000)
            return
          }
        } catch (err) {
          console.error('Session exchange error:', err)
        }
      }

      // コードがない場合、またはエラーの場合は既存のユーザー確認を行う
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setMessage('ログイン確認済み！ダッシュボードへ移動します...')
        setTimeout(() => {
          router.replace(next)
        }, 1000)
      } else {
        // 5秒待ってから再チェック
        setTimeout(async () => {
          const { data: { user: recheckUser } } = await supabase.auth.getUser()
          if (recheckUser) {
            router.replace(next)
          } else {
            setMessage('登録を確認できませんでした。ログインページへ移動します...')
            setTimeout(() => {
              router.replace('/auth/login')
            }, 1000)
          }
        }, 5000)
      }
    }

    handleAuth()

    return () => {
      clearInterval(dotsInterval)
    }
  }, [router, next])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {message}{dots}
        </h2>

        <p className="text-gray-600 mb-6">
          アカウントの設定を行っています。<br />
          このまましばらくお待ちください。
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">データベースへの登録</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
            <span className="text-sm text-gray-600">セッションの確立</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
            <span className="text-sm text-gray-600">プロファイルの作成</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">読み込み中...</h2>
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  )
}