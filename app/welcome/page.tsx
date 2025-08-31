'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    // LocalStorageから登録データを取得
    const storedData = localStorage.getItem('registrationData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setUserData(data);
      // ダッシュボード用にuserデータも保存
      localStorage.setItem('user', JSON.stringify(data));
      // 元のregistrationDataは削除
      localStorage.removeItem('registrationData');
      
      // APIキーがない場合は生成を試みる
      if (!data.apiKey && data.id) {
        generateApiKey(data);
      }
    } else {
      // 既にuserデータがある場合はそれを使用
      const userData = localStorage.getItem('user');
      if (userData) {
        const data = JSON.parse(userData);
        setUserData(data);
        
        // APIキーがない場合は生成を試みる
        if (!data.apiKey && data.id) {
          generateApiKey(data);
        }
      } else {
        // データがない場合はダッシュボードへリダイレクト（ログインしている前提）
        router.push('/dashboard');
      }
    }
  }, [router]);

  const generateApiKey = async (user: any) => {
    setIsGeneratingKey(true);
    setApiKeyError(null);
    
    try {
      const response = await fetch('/api/auth/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          plan: user.plan || 'beta'
        }),
      });

      const data = await response.json();

      if (data.success && data.apiKey) {
        // APIキーを取得できた場合、userDataを更新
        const updatedUser = { ...user, apiKey: data.apiKey };
        setUserData(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else if (data.hasExistingKey) {
        // 既存のキーがある場合（表示はできない）
        setApiKeyError('APIキーは既に生成されています。ダッシュボードから確認してください。');
      } else {
        // エラーの場合
        setApiKeyError(data.error || 'APIキーの生成に失敗しました');
        console.error('API key generation failed:', data);
      }
    } catch (error) {
      console.error('API key generation error:', error);
      setApiKeyError('APIキーの生成中にエラーが発生しました');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyApiKey = () => {
    if (userData?.apiKey) {
      navigator.clipboard.writeText(userData.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 成功メッセージ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            登録完了！
          </h1>
          <p className="text-xl text-gray-600">
            XBRL財務データAPIへようこそ、{userData.name || userData.email?.split('@')[0]}さん
          </p>
        </div>

        {/* APIキー表示 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">あなたのAPIキー</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">このAPIキーは一度だけ表示されます。必ず安全な場所に保管してください。</p>
            
            <div className="flex items-center gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={
                  userData.apiKey ? userData.apiKey : 
                  isGeneratingKey ? 'APIキーを生成中...' : 
                  apiKeyError ? 'エラー: APIキー生成失敗' :
                  'APIキーを生成中...'
                }
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                {showApiKey ? '隠す' : '表示'}
              </button>
              <button
                onClick={copyApiKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    コピー済み
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    コピー
                  </>
                )}
              </button>
            </div>
          </div>

          {/* エラーメッセージ表示 */}
          {apiKeyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600">
                <span className="font-semibold">⚠️ エラー:</span> {apiKeyError}
              </p>
              <p className="text-xs text-red-500 mt-2">
                サポートが必要な場合は、登録時のメールアドレスとユーザーIDをお知らせください。
              </p>
            </div>
          )}

          {/* プラン情報 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">プラン</p>
              <p className="font-semibold text-blue-600">
                {userData.plan === 'beta' ? 'ベータプラン' : userData.plan || 'Free'}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">月間制限</p>
              <p className="font-semibold text-green-600">1,000回</p>
            </div>
          </div>

          {/* 次のステップ */}
          <h3 className="font-semibold text-lg mb-4">次のステップ</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/docs')}
              className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-600">📚 APIドキュメントを読む</h3>
                  <p className="text-gray-600 text-sm mt-1">エンドポイントとパラメータ一覧</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push('/examples')}
              className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-600">💻 サンプルコードを見る</h3>
                  <p className="text-gray-600 text-sm mt-1">実装例とベストプラクティス</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-600">📊 ダッシュボードへ</h3>
                  <p className="text-gray-600 text-sm mt-1">API使用状況とアカウント管理</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* クイックスタートコード */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">クイックスタート</h4>
            <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`curl -H "X-API-Key: ${userData.apiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies`}
            </pre>
          </div>
        </div>

        {/* サポート情報 */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ご不明な点がございましたら、
            <a href="/support" className="text-blue-600 hover:underline mx-1">ヘルプセンター</a>
            をご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}