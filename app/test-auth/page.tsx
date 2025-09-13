'use client'

export default function TestAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          認証ページテスト
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <a 
              href="/auth/login" 
              className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              ログインページへ
            </a>
            <a 
              href="/auth/register" 
              className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              登録ページへ
            </a>
            <a 
              href="/dashboard" 
              className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              ダッシュボードへ
            </a>
          </div>
          <div className="mt-6 text-sm text-gray-600">
            <p>ページステータス:</p>
            <ul className="mt-2 space-y-1">
              <li>• /auth/login - ログインページ</li>
              <li>• /auth/register - 登録ページ</li>
              <li>• /dashboard - ダッシュボード</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}