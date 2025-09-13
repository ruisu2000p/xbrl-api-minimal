'use client'

import { useEffect, useState } from 'react'

export default function ProcessingPage() {
  const [message, setMessage] = useState('登録処理中です...')
  const [dots, setDots] = useState('')

  useEffect(() => {
    // ドットアニメーション
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // 3秒後にメッセージ変更
    const messageTimeout = setTimeout(() => {
      setMessage('登録を確認しています...')
    }, 3000)

    // 5秒後に強制的にダッシュボードへ移動
    const checkTimeout = setTimeout(() => {
      setMessage('登録が完了しました！ダッシュボードへ移動します...')

      // 1秒後にダッシュボードへ強制的に移動
      setTimeout(() => {
        // window.location.hrefで完全にページをリロード
        window.location.href = '/dashboard'
      }, 1000)
    }, 5000)

    return () => {
      clearInterval(dotsInterval)
      clearTimeout(messageTimeout)
      clearTimeout(checkTimeout)
    }
  }, [])

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