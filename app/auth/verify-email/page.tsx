'use client'

import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
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
            
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              メールをご確認ください
            </h2>
            
            <p className="mt-2 text-sm text-gray-600">
              登録いただいたメールアドレスに確認メールを送信しました。
            </p>
            
            <p className="mt-4 text-sm text-gray-600">
              メール内のリンクをクリックして、アカウントの有効化を完了してください。
            </p>
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-500">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
            </div>
            
            <div className="mt-6">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                ログインページへ戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}