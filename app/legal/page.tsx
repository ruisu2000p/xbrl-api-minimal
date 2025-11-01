'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const translations = {
  ja: {
    back: '← 戻る',
    title: '特定商取引法に基づく表記',
    pageTitle: '特定商取引法に基づく表記',
    businessName: '事業者名',
    manager: '運営統括責任者',
    address: '所在地',
    addressNote: '※バーチャルオフィスを利用している場合はその旨を明記してください',
    contact: 'お問い合わせ',
    contactNote: '※お問い合わせは上記メールアドレスまでお願いいたします。',
    price: '販売価格',
    priceNote: '※価格は税込表示です',
    paymentMethod: '支払方法',
    paymentTiming: '支払時期',
    deliveryTiming: 'サービスの提供時期',
    returnPolicy: '返品・キャンセルについて',
    cancellation: 'サブスクリプションの解約について',
    disclaimer: '免責事項'
  },
  en: {
    back: '← Back',
    title: 'Specified Commercial Transaction Act',
    pageTitle: 'Specified Commercial Transaction Act',
    businessName: 'Business Name',
    manager: 'General Manager',
    address: 'Address',
    addressNote: '※If using a virtual office, please clearly state this',
    contact: 'Contact',
    contactNote: '※Please contact us at the email address above.',
    price: 'Price',
    priceNote: '※Prices include tax',
    paymentMethod: 'Payment Method',
    paymentTiming: 'Payment Timing',
    deliveryTiming: 'Service Delivery Timing',
    returnPolicy: 'Return Policy',
    cancellation: 'Subscription Cancellation',
    disclaimer: 'Disclaimer'
  }
};

export default function LegalPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  useEffect(() => {
    // ブラウザの言語設定を取得
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      setLang('en');
    }
  }, []);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
                {t.back}
              </button>
              <h1 className="text-xl font-bold">{t.title}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('ja')}
                className={`px-3 py-1 rounded ${lang === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                日本語
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded ${lang === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">{t.pageTitle}</h1>

          {lang === 'ja' ? (
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.businessName}</h2>
                <p className="text-gray-700">Financial Information next (FIN)</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.manager}</h2>
                <p className="text-gray-700">[運営者名を記載]</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.address}</h2>
                <p className="text-gray-700">東京都渋谷区道玄坂1丁目10番8号渋谷道玄坂東急ビル2F−C</p>
                <p className="text-sm text-gray-500 mt-2">
                  ※バーチャルオフィスを利用しています
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.contact}</h2>
                <p className="text-gray-700">
                  メールアドレス: <a href="mailto:info@financial-info-next.com" className="text-blue-600 hover:underline">info@financial-info-next.com</a>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  ※お問い合わせへの回答はベストエフォートベースで対応いたします。緊急性の高いお問い合わせや技術的なサポートについては、有料プランユーザー様を優先して対応させていただきます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.price}</h2>
                <div className="text-gray-700 space-y-2">
                  <p><strong>フリーミアムプラン:</strong> $0/月（14日間無料トライアル）</p>
                  <p><strong>スタンダードプラン（月額）:</strong> $25/月</p>
                  <p><strong>スタンダードプラン（年額）:</strong> $240/年（約$20/月、20%割引）</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t.priceNote}
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.paymentMethod}</h2>
                <p className="text-gray-700">クレジットカード決済（Stripe経由）</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.paymentTiming}</h2>
                <p className="text-gray-700">
                  サービス利用開始時に初回決済が行われ、以降は毎月または毎年（選択されたプランに応じて）自動的に課金されます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.deliveryTiming}</h2>
                <p className="text-gray-700">
                  お申し込み後、即座にサービスをご利用いただけます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.returnPolicy}</h2>
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
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.cancellation}</h2>
                <p className="text-gray-700 mb-3">
                  ダッシュボードからいつでもサブスクリプションを解約できます。解約後も、現在の課金期間終了までサービスをご利用いただけます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.disclaimer}</h2>
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
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.businessName}</h2>
                <p className="text-gray-700">Financial Information next (FIN)</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.manager}</h2>
                <p className="text-gray-700">[Manager name to be specified]</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.address}</h2>
                <p className="text-gray-700">2F-C, Shibuya Dogenzaka Tokyu Building, 1-10-8 Dogenzaka, Shibuya-ku, Tokyo, Japan</p>
                <p className="text-sm text-gray-500 mt-2">
                  ※We use a virtual office
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.contact}</h2>
                <p className="text-gray-700">
                  Email: <a href="mailto:info@financial-info-next.com" className="text-blue-600 hover:underline">info@financial-info-next.com</a>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  ※We respond to inquiries on a best-effort basis. For urgent inquiries and technical support, we prioritize responses to paid plan users.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.price}</h2>
                <div className="text-gray-700 space-y-2">
                  <p><strong>Freemium Plan:</strong> $0/month (14-day free trial)</p>
                  <p><strong>Standard Plan (Monthly):</strong> $25/month</p>
                  <p><strong>Standard Plan (Yearly):</strong> $240/year (approx. $20/month, 20% off)</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t.priceNote}
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.paymentMethod}</h2>
                <p className="text-gray-700">Credit Card Payment (via Stripe)</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.paymentTiming}</h2>
                <p className="text-gray-700">
                  The first payment is made when you start using the service, and thereafter you will be automatically charged monthly or annually (depending on the selected plan).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.deliveryTiming}</h2>
                <p className="text-gray-700">
                  The service will be available immediately after registration.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.returnPolicy}</h2>
                <p className="text-gray-700 mb-3">
                  Due to the nature of digital content, we generally do not accept returns or refunds for this service.
                </p>
                <p className="text-gray-700 mb-3">
                  However, we will consider refunds in the following cases:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>When the service has serious defects and cannot be used</li>
                  <li>When the service cannot be provided due to reasons attributable to the Company</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.cancellation}</h2>
                <p className="text-gray-700 mb-3">
                  You can cancel your subscription at any time from the dashboard. After cancellation, you can continue to use the service until the end of the current billing period.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3 text-gray-900">{t.disclaimer}</h2>
                <div className="text-gray-700 space-y-3">
                  <p>
                    This service is not an investment advisory business and only provides information as a financial data analysis tool. We do not provide specific investment decisions or recommendations.
                  </p>
                  <p>
                    Although we provide data based on publicly available securities reports, we do not guarantee the accuracy or completeness of the data.
                  </p>
                  <p>
                    The Company shall not be liable for any damages arising from the use of this service.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
