'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupportPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('api');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = {
    api: '🔧 API・技術',
    account: '👤 アカウント',
    billing: '💳 料金・支払い',
    data: '📊 データ関連',
    general: '❓ 一般的な質問'
  };

  const faqs = {
    api: [
      {
        question: 'APIキーの取得方法を教えてください',
        answer: 'ダッシュボードにログイン後、「APIキー」セクションから新しいキーを生成できます。生成されたキーは必ず安全な場所に保管してください。'
      },
      {
        question: 'レート制限について教えてください',
        answer: 'Free: 100回/月、Standard: 500回/月、Pro: 無制限となっています。制限に達した場合は503エラーが返されます。'
      },
      {
        question: 'APIエンドポイントのドキュメントはどこで確認できますか？',
        answer: 'APIドキュメントページで全エンドポイントの詳細仕様をご確認いただけます。サンプルコードや試行機能も利用可能です。'
      },
      {
        question: 'データの更新頻度はどの程度ですか？',
        answer: '有価証券報告書の提出に合わせて四半期ごとに更新されます。最新データは提出から1-2営業日以内に反映されます。'
      },
      {
        question: 'APIのタイムアウト時間は？',
        answer: 'APIのタイムアウト時間は30秒です。大量のデータを取得する場合は、ページネーションを活用してください。'
      }
    ],
    account: [
      {
        question: 'アカウントの作成方法',
        answer: 'メールアドレスとパスワードでアカウントを作成できます。確認メールをお送りしますので、リンクをクリックして認証を完了してください。'
      },
      {
        question: 'パスワードを忘れた場合の対処法',
        answer: 'ログインページの「パスワードを忘れた方」リンクから、パスワードリセット用のメールを送信できます。'
      },
      {
        question: 'アカウント情報の変更方法',
        answer: 'ダッシュボードの「アカウント設定」から、メールアドレスやプロフィール情報を変更できます。'
      },
      {
        question: 'アカウントの削除方法',
        answer: 'アカウント設定の最下部にある「アカウント削除」からお手続きいただけます。削除後はデータの復旧はできませんのでご注意ください。'
      }
    ],
    billing: [
      {
        question: '料金プランの変更方法',
        answer: 'ダッシュボードの「プラン管理」から、いつでもプランの変更が可能です。アップグレードは即座に反映され、ダウングレードは次回請求日から適用されます。'
      },
      {
        question: '支払い方法について',
        answer: 'クレジットカード（Visa、MasterCard、JCB、American Express）での支払いに対応しています。請求は月次で行われます。'
      },
      {
        question: '領収書の発行について',
        answer: 'ダッシュボードの「請求履歴」から、いつでも領収書をダウンロードできます。PDF形式でご提供いたします。'
      },
      {
        question: '無料トライアルはありますか？',
        answer: 'Freeプランで機能をお試しいただけます。クレジットカード登録なしで、すぐにAPIをテストできます。'
      },
      {
        question: '返金ポリシーについて',
        answer: 'サービスに満足いただけない場合、30日以内であれば全額返金いたします。サポートまでお問い合わせください。'
      }
    ],
    data: [
      {
        question: '取得可能なデータの範囲は？',
        answer: '日本の上場企業4,000社以上、2005年〜2025年の有価証券報告書データを提供しています。業種や市場での絞り込みも可能です。'
      },
      {
        question: 'データの正確性について',
        answer: 'EDINETから取得した公式データを使用していますが、システム処理による変換エラーの可能性があります。重要な判断には原典をご確認ください。'
      },
      {
        question: 'データの商用利用は可能ですか？',
        answer: 'Standard以上のプランで商用利用が可能です。ただし、データの再配布や競合サービスでの利用は禁止されています。'
      },
      {
        question: 'バックアップデータの提供はありますか？',
        answer: 'Proプランでは、データのバックアップダウンロード機能を提供しています。JSON、CSV、Excel形式に対応しています。'
      }
    ],
    general: [
      {
        question: 'このサービスは何ができますか？',
        answer: '日本企業の財務データを簡単に取得できるAPIサービスです。売上、利益、ROEなどの財務指標を時系列で分析できます。'
      },
      {
        question: 'どのような方に利用されていますか？',
        answer: 'フィンテック企業、投資会社、研究機関、個人投資家など、幅広い分野でご利用いただいています。'
      },
      {
        question: 'サービスの停止予定はありますか？',
        answer: '継続的なサービス提供を予定しています。万が一停止する場合は、6ヶ月前にお知らせいたします。'
      },
      {
        question: 'APIの使用例やサンプルコードはありますか？',
        answer: 'サンプルコードページで、財務分析、時系列分析などの実装例を6つの言語で提供しています。'
      }
    ]
  };

  const filteredFaqs = selectedCategory 
    ? faqs[selectedCategory as keyof typeof faqs]?.filter(faq => 
        searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">ヘルプセンター</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/docs')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                APIドキュメント
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヒーローセクション */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">お困りのことはありませんか？</h1>
          <p className="text-xl text-gray-600 mb-8">
            よくある質問やガイドで解決方法を見つけてください
          </p>
          
          {/* 検索バー */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="キーワードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* カテゴリサイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">カテゴリ</h3>
              <div className="space-y-2">
                {Object.entries(categories).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedCategory === key
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* クイックリンク */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-bold mb-3">クイックリンク</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/docs')}
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900"
                  >
                    📚 APIドキュメント
                  </button>
                  <button
                    onClick={() => router.push('/examples')}
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900"
                  >
                    💻 サンプルコード
                  </button>
                  <button
                    onClick={() => router.push('/sdk')}
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900"
                  >
                    🛠️ SDK
                  </button>
                  <a
                    href="#status"
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900"
                  >
                    📊 API ステータス
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ コンテンツ */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {categories[selectedCategory as keyof typeof categories]}
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredFaqs.length}件の記事
                </span>
              </div>

              {/* FAQ リスト */}
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <details key={index} className="border border-gray-200 rounded-lg">
                    <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 font-medium">
                      {faq.question}
                    </summary>
                    <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>

              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium mb-2">該当する記事が見つかりませんでした</h3>
                  <p className="text-gray-600 mb-4">別のキーワードで検索するか、他のカテゴリをお試しください</p>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    お問い合わせ
                  </button>
                </div>
              )}
            </div>

            {/* お問い合わせセクション */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white mt-8">
              <h3 className="text-2xl font-bold mb-4">解決しませんでしたか？</h3>
              <p className="mb-6 opacity-90">
                サポートチームが直接お手伝いいたします。お気軽にお問い合わせください。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-2">📧 メールサポート</h4>
                  <p className="text-sm opacity-90 mb-3">24時間以内に回答</p>
                  <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
                    メールで問い合わせ
                  </button>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-2">💬 チャットサポート</h4>
                  <p className="text-sm opacity-90 mb-3">平日 9:00-18:00</p>
                  <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
                    チャットを開始
                  </button>
                </div>
              </div>
            </div>

            {/* API ステータス */}
            <div id="status" className="bg-white rounded-xl shadow-sm p-8 mt-8">
              <h3 className="text-2xl font-bold mb-6">API ステータス</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium">API サービス</span>
                  </div>
                  <span className="text-green-700 text-sm">稼働中</span>
                </div>
                <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium">データベース</span>
                  </div>
                  <span className="text-green-700 text-sm">稼働中</span>
                </div>
                <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium">認証システム</span>
                  </div>
                  <span className="text-green-700 text-sm">稼働中</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>最終更新:</strong> 2025年8月14日 14:30 JST<br />
                  <strong>稼働率 (過去30日):</strong> 99.9%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}