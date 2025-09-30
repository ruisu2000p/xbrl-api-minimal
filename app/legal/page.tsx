'use client';

import { useRouter } from 'next/navigation';

export default function LegalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </button>
              <h1 className="text-xl font-bold">特定商取引法に基づく表記</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">特定商取引法に基づく表記</h1>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">事業者名</h2>
              <p className="text-gray-700">Financial Information next (FIN)</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">運営統括責任者</h2>
              <p className="text-gray-700">[運営者名を記載]</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">所在地</h2>
              <p className="text-gray-700">[事業所の住所を記載]</p>
              <p className="text-sm text-gray-500 mt-2">
                ※バーチャルオフィスを利用している場合はその旨を明記してください
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">お問い合わせ</h2>
              <p className="text-gray-700">
                メールアドレス: <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                ※お問い合わせは上記メールアドレスまでお願いいたします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">販売価格</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>フリーミアムプラン:</strong> ¥0/月</p>
                <p><strong>スタンダードプラン:</strong> ¥2,980/月</p>
                <p className="text-sm text-gray-500 mt-2">
                  ※価格は税込表示です
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">支払方法</h2>
              <p className="text-gray-700">クレジットカード決済（Stripe経由）</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">支払時期</h2>
              <p className="text-gray-700">
                サービス利用開始時に初回決済が行われ、以降は毎月または毎年（選択されたプランに応じて）自動的に課金されます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">サービスの提供時期</h2>
              <p className="text-gray-700">
                お申し込み後、即座にサービスをご利用いただけます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">返品・キャンセルについて</h2>
              <p className="text-gray-700 mb-3">
                本サービスはデジタルコンテンツの性質上、原則として返品・返金には応じかねます。
              </p>
              <p className="text-gray-700 mb-3">
                ただし、以下の場合には返金対応を検討いたします：
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>サービスに重大な不具合があり、利用できない場合</li>
                <li>当社の責めに帰すべき事由により、サービスが提供できない場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">サブスクリプションの解約について</h2>
              <p className="text-gray-700 mb-3">
                ダッシュボードからいつでもサブスクリプションを解約できます。解約後も、現在の課金期間終了までサービスをご利用いただけます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">免責事項</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  本サービスは投資助言業ではなく、財務データの分析ツールとして情報提供のみを行っています。具体的な投資判断や推奨は行いません。
                </p>
                <p>
                  公開されている有価証券報告書に基づいてデータを提供していますが、データの正確性や完全性について保証するものではありません。
                </p>
                <p>
                  本サービスの利用により生じたいかなる損害についても、当社は一切の責任を負いかねます。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
