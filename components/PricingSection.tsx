import Link from 'next/link';

const PLANS = [
  {
    name: 'フリーミアム',
    price: '¥0 / 月',
    description: '直近1年間の財務データをブラウザからすぐに確認できます。',
    features: ['最新年度の財務データ', 'APIコール 5,000件 / 月', 'メールサポート'],
    highlight: '個人投資家や検証用途に最適',
  },
  {
    name: 'スタンダード',
    price: '¥2,980 / 月',
    description: '全期間の財務データと高度な分析を解放します。',
    features: ['全期間の財務データ', 'APIコール 無制限', '優先サポート', 'カスタムレポート'],
    highlight: 'チームでの継続的な利用におすすめ',
    popular: true,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-price-tag-3-line text-blue-600 mr-2"></i>
            <span className="text-blue-700 text-sm font-medium">シンプルな料金体系</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">必要なデータに合わせて選択</h2>
          <p className="text-lg text-gray-600">
            初期費用や複雑な契約は不要。数分で導入でき、すぐに財務データを活用できます。
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border ${
                plan.popular ? 'border-blue-200 shadow-2xl ring-1 ring-blue-100' : 'border-gray-200 shadow-xl'
              } bg-white/90 backdrop-blur-sm p-8 transition-transform duration-300 hover:-translate-y-1`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
                  人気プラン
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-blue-600 mt-2">{plan.highlight}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
              </div>

              <p className="text-gray-600 mb-8 leading-relaxed">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start text-gray-700">
                    <i className="ri-check-line text-green-500 mt-1 mr-3"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="#demo"
                prefetch={false}
                className={`flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition-colors cursor-pointer ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                    : 'border border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                まずはデモで確認
                <i className="ri-arrow-right-up-line ml-2 text-lg"></i>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
