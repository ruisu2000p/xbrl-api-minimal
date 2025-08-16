'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 削除プレビューを取得
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setPreview(data);
        setShowConfirmation(true);
      } else {
        setError(data.error || 'プレビューの取得に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // アカウント削除を実行
  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('確認テキストが正しくありません');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmText })
      });

      const data = await response.json();

      if (response.ok) {
        // 削除成功 - ローカルストレージをクリア
        localStorage.clear();
        sessionStorage.clear();
        
        // さよならメッセージを表示してからリダイレクト
        alert(data.farewell || 'アカウントが削除されました。ご利用ありがとうございました。');
        router.push('/');
      } else {
        setError(data.error || 'アカウントの削除に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            アカウント削除
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            退会手続き
          </p>
        </div>

        {!showConfirmation ? (
          /* ステップ1: 認証フォーム */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      警告
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>アカウントを削除すると、以下のデータがすべて失われます：</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>登録情報</li>
                        <li>APIキー</li>
                        <li>利用履歴</li>
                      </ul>
                      <p className="mt-2 font-semibold">この操作は取り消せません。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handlePreview}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-3 py-2 border"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-3 py-2 border"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Link
                    href="/dashboard"
                    className="flex-1 text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    キャンセル
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? '確認中...' : '次へ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* ステップ2: 削除確認 */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              削除されるデータ
            </h2>

            {preview && (
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">メールアドレス:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{preview.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">アカウント作成日:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {preview.dataToBeDeleted?.accountAge}前
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">APIキー数:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {preview.dataToBeDeleted?.totalApiKeys}個
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    削除を確認するには、下のテキストボックスに
                    <span className="font-mono font-bold mx-1">DELETE MY ACCOUNT</span>
                    と入力してください。
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    確認テキスト
                  </label>
                  <input
                    type="text"
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-3 py-2 border"
                  />
                </div>

                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? '削除中...' : 'アカウントを削除'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* フッターリンク */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}