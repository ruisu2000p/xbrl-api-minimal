
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'フリーミアム',
      price: { monthly: 0, yearly: 0 },
      description: '直近1年間のデータに限定アクセス',
      features: [
        '直近1年間の財務データアクセス'
      ],
      limitations: [
        '過去データは1年間のみ'
      ],
      buttonText: '無料で始める',
      buttonStyle: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      popular: false,
      icon: 'ri-seedling-line',
      gradient: 'from-gray-400 to-gray-500'
    },
    {
      name: 'スタンダード',
      price: { monthly: 2980, yearly: 29800 },
      description: 'すべてのデータに無制限アクセス',
      features: [
        '全期間の財務データアクセス',
        '基本的なサポート'
      ],
      limitations: [],
      buttonText: 'スタンダードを選択',
      buttonStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700',
      popular: true,
      icon: 'ri-vip-crown-line',
      gradient: 'from-blue-500 to-indigo-500'
    }
  ];

  return (
    <section className="pt-24 pb-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-price-tag-3-line text-blue-600 mr-2"></i>
            <span className="text-blue-700 text-sm font-medium">透明な料金体系</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              シンプルで分かりやすい
            </span>
            <br/>料金プラン
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            あなたのニーズに合わせて選択できる2つのプラン。
            <br/>いつでもアップグレード・ダウングレード可能です。
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-2 shadow-lg">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                月額プラン
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer whitespace-nowrap relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                年額プラン
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  20%お得
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                plan.popular
                  ? 'border-blue-200 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    <i className="ri-fire-line mr-1"></i>
                    最も人気
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-8">
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <i className={`${plan.icon} text-white text-2xl`}></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ¥{plan.price[billingPeriod].toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-2">
                    /{billingPeriod === 'monthly' ? '月' : '年'}
                  </span>
                </div>
                {billingPeriod === 'yearly' && plan.price.yearly > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    月額換算 ¥{Math.floor(plan.price.yearly / 12).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="ri-check-line text-green-500 mr-2"></i>
                  含まれる機能
                </h4>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <i className="ri-check-line text-green-500 mr-3 mt-0.5 flex-shrink-0"></i>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              {plan.limitations.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="ri-information-line text-amber-500 mr-2"></i>
                    制限事項
                  </h4>
                  <ul className="space-y-3">
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li key={limitIndex} className="flex items-start">
                        <i className="ri-close-line text-amber-500 mr-3 mt-0.5 flex-shrink-0"></i>
                        <span className="text-gray-600">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Button */}
              <button className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${plan.buttonStyle}`}>
                {plan.buttonText}
              </button>

              {/* Additional info */}
              <div className="text-center mt-6 text-sm text-gray-500">
                {plan.name === 'フリーミアム' ? (
                  <>
                    <i className="ri-time-line mr-1"></i>
                    クレジットカード不要
                  </>
                ) : (
                  <>
                    <i className="ri-shield-check-line mr-1"></i>
                    すぐに利用開始
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">料金に関するよくある質問</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                プラン変更はいつでも可能ですか？
              </h4>
              <p className="text-gray-600 text-sm">
                はい、いつでもプランのアップグレード・ダウングレードが可能です。変更は次の請求サイクルから適用されます。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                支払い方法は何がありますか？
              </h4>
              <p className="text-gray-600 text-sm">
                Stripeによる安全な決済システムでクレジットカード決済に対応しています。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                解約手続きは簡単ですか？
              </h4>
              <p className="text-gray-600 text-sm">
                管理画面からいつでも簡単に解約できます。解約後も契約期間終了まではサービスをご利用いただけます。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                年額プランの割引について
              </h4>
              <p className="text-gray-600 text-sm">
                年額プランをお選びいただくと20%の割引が適用され、大変お得にご利用いただけます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}