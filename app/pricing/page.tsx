'use client';

import { Check, X, Zap, ArrowRight } from 'react-feather';
import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);

  const handleApplyDiscount = () => {
    if (discountCode === 'EARLY2024') {
      setDiscountApplied(true);
    }
  };

  const getPrice = () => {
    if (discountApplied) {
      return '¥1,490';
    }
    return '¥2,980';
  };

  const plans = [
    {
      id: 'free',
      name: 'フリーミアムプラン',
      price: '¥0',
      description: '個人投資家や学生向けの基本機能',
      features: [
        '上場企業100社の財務データアクセス',
        '最新1期分の有価証券報告書',
        '基本的な財務指標の閲覧',
        'APIコール: 100回/月',
        'Markdown形式でのデータ取得',
        'コミュニティサポート',
      ],
      limitations: [
        '過去データへのアクセス制限',
        'エクスポート機能制限',
        'バッチ処理なし',
        'カスタムクエリなし',
      ],
      buttonText: '無料で始める',
      buttonVariant: 'secondary',
      popular: false,
    },
    {
      id: 'pro',
      name: 'プロフェッショナルプラン',
      price: getPrice(),
      originalPrice: discountApplied ? '¥2,980' : null,
      period: '/月',
      description: 'プロフェッショナル投資家・研究者向け',
      features: [
        '全5,220社の財務データへの無制限アクセス',
        '過去10年分の有価証券報告書',
        '詳細な財務分析指標とトレンド分析',
        'APIコール: 無制限',
        'リアルタイムデータ更新',
        'Excel/CSV/JSONでのエクスポート',
        'バッチ処理とカスタムクエリ',
        'Claude Desktop統合',
        'MCP Serverツール完全版',
        '優先サポート（24時間以内の返信）',
        'APIレート制限の優先処理',
        'Webhook連携',
      ],
      limitations: [],
      buttonText: 'プロプランを始める',
      buttonVariant: 'primary',
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            料金プラン
          </h1>
          <p className="text-xl text-gray-300">
            あなたのニーズに合わせた最適なプランをお選びください
          </p>
        </div>

        {/* Discount Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="text-yellow-400 mr-2" size={24} />
            <h2 className="text-2xl font-bold text-white">
              期間限定！早期アクセス割引
            </h2>
          </div>
          <p className="text-white mb-4">
            今なら特別割引コード「EARLY2024」で50%OFF！
          </p>
          <div className="flex justify-center items-center gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="割引コードを入力"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 flex-1"
            />
            <button
              onClick={handleApplyDiscount}
              className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              適用
            </button>
          </div>
          {discountApplied && (
            <p className="text-green-400 mt-2 font-semibold">
              ✓ 割引が適用されました！
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-purple-900/50 to-blue-900/50 border-2 border-purple-500'
                  : 'bg-gray-800/50 border border-gray-700'
              } backdrop-blur-sm`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    おすすめ
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-400">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.originalPrice && (
                    <span className="ml-2 text-xl text-gray-500 line-through">
                      {plan.originalPrice}
                    </span>
                  )}
                  {plan.period && (
                    <span className="text-gray-400 ml-1">{plan.period}</span>
                  )}
                </div>
              </div>

              <div className="mb-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start">
                    <X className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedPlan(plan.id as 'free' | 'pro')}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  plan.buttonVariant === 'primary'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {plan.buttonText}
                <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise Section */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            エンタープライズプラン
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            大規模な組織や特別な要件をお持ちの企業様向けに、カスタマイズ可能なエンタープライズプランをご用意しています。
            専任サポート、SLA保証、オンプレミス展開オプションなど、お客様のニーズに合わせた最適なソリューションをご提供します。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            お問い合わせ
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            よくある質問
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            <details className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <summary className="text-white font-semibold cursor-pointer">
                フリーミアムプランからプロプランへの移行はいつでも可能ですか？
              </summary>
              <p className="text-gray-300 mt-3">
                はい、いつでもアップグレード可能です。アップグレード後は日割り計算で課金されます。
              </p>
            </details>
            <details className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <summary className="text-white font-semibold cursor-pointer">
                APIの利用制限を超えた場合はどうなりますか？
              </summary>
              <p className="text-gray-300 mt-3">
                フリーミアムプランの場合、月間制限に達するとAPIコールがブロックされます。
                プロプランへのアップグレードをご検討ください。
              </p>
            </details>
            <details className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <summary className="text-white font-semibold cursor-pointer">
                キャンセルポリシーについて教えてください
              </summary>
              <p className="text-gray-300 mt-3">
                いつでもキャンセル可能です。キャンセル後も、お支払い済みの期間の終了まではサービスをご利用いただけます。
              </p>
            </details>
            <details className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <summary className="text-white font-semibold cursor-pointer">
                学生割引はありますか？
              </summary>
              <p className="text-gray-300 mt-3">
                学生の方には特別割引をご用意しています。有効な学生証明書をお持ちの方は、お問い合わせください。
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}