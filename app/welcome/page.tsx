'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // LocalStorageから登録チE�Eタを取征E    const storedData = localStorage.getItem('registrationData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setUserData(data);
      // ダチE��ュボ�Eド用にuserチE�Eタも保孁E      localStorage.setItem('user', JSON.stringify(data));
      // 允E�EregistrationDataは削除
      localStorage.removeItem('registrationData');
    } else {
      // 既にuserチE�Eタがある場合�Eそれを使用
      const userData = localStorage.getItem('user');
      if (userData) {
        setUserData(JSON.parse(userData));
      } else {
        // チE�EタがなぁE��合�Eホ�EムへリダイレクチE        router.push('/');
      }
    }
  }, [router]);

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
        {/* 成功メチE��ージ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            登録完亁E��E          </h1>
          <p className="text-xl text-gray-600">
            XBRL財務データAPIへようこそ、{userData.name}さん
          </p>
        </div>

        {/* APIキー表示 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">あなた�EAPIキー</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">こ�EAPIキーは一度だけ表示されます。忁E��安�Eな場所に保管してください、E/p>
            
            <div className="flex items-center gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={userData.apiKey || 'APIキーを生成中...'}
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                {showApiKey ? '隠ぁE : '表示'}
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
                    コピ�E済み
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    コピ�E
                  </>
                )}
              </button>
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">アカウント情報</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">メールアドレス</dt>
                <dd className="font-medium">{userData.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">プラン</dt>
                <dd className="font-medium">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    ベ�Eタアクセス
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">API利用制陁E/dt>
                <dd className="font-medium">1,000囁E朁E/dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">チE�Eタアクセス</dt>
                <dd className="font-medium">全20年刁E/dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 次のスチE��チE*/}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">次のスチE��チE/h2>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/docs')}
              className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-600">📚 APIドキュメントを読む</h3>
                  <p className="text-gray-600 text-sm mt-1">エンド�Eイントとパラメータの詳細を確誁E/p>
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
                  <p className="text-gray-600 text-sm mt-1">実裁E��とベスト�EラクチE��ス</p>
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
                  <h3 className="font-semibold text-lg group-hover:text-blue-600">📊 ダチE��ュボ�Eドへ</h3>
                  <p className="text-gray-600 text-sm mt-1">API使用状況とアカウント管琁E/p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* クイチE��スタートコーチE*/}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">クイチE��スターチE/h4>
            <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`curl -H "X-API-Key: ${userData.apiKey || 'YOUR_API_KEY'}" \\
  https://api.xbrl.jp/v1/companies`}
            </pre>
          </div>
        </div>

        {/* サポ�Eト情報 */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ご不�Eな点がございましたら、E            <a href="/support" className="text-blue-600 hover:underline mx-1">ヘルプセンター</a>
            をご覧ぁE��だくか、E            <a href="mailto:support@xbrl-api.example.com" className="text-blue-600 hover:underline mx-1">サポ�EチE/a>
            までお問ぁE��わせください、E          </p>
        </div>
      </div>
    </div>
  );
}
