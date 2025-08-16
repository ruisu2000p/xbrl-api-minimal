'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleVerify = async (e: React.FormEvent) => {
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
        setStep(2);
      } else {
        setError(data.error || '認証に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

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
        alert('アカウントが削除されました。ご利用ありがとうございました。');
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">アカウント削除</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          {step === 1 ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                <p className="text-red-800 text-sm font-semibold">⚠️ 警告</p>
                <p className="text-red-700 text-sm mt-1">
                  アカウントを削除すると、すべてのデータが失われます。
                  この操作は取り消せません。
                </p>
              </div>

              <form onSubmit={handleVerify}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm px-3 py-2 border"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      パスワード
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm px-3 py-2 border"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="flex-1 text-center py-2 px-4 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-4 border border-transparent rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? '確認中...' : '次へ'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">削除の確認</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-sm">
                  削除を確認するには、
                  <span className="font-mono font-bold mx-1">DELETE MY ACCOUNT</span>
                  と入力してください。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="block w-full rounded border-gray-300 shadow-sm px-3 py-2 border"
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
                    className="flex-1 py-2 px-4 border border-transparent rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '削除中...' : 'アカウントを削除'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}