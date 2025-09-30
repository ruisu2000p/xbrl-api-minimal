
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { t } = useLanguage();

  const plans = [
    {
      name: t('pricing.plan.freemium.name'),
      price: { monthly: 0, yearly: 0 },
      description: t('pricing.plan.freemium.description'),
      features: [
        t('pricing.plan.freemium.feature1')
      ],
      limitations: [
        t('pricing.plan.freemium.limitation1')
      ],
      buttonText: t('pricing.plan.freemium.button'),
      buttonStyle: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700',
      popular: false,
      icon: 'ri-seedling-line',
      gradient: 'from-gray-400 to-gray-500'
    },
    {
      name: t('pricing.plan.standard.name'),
      price: { monthly: 2980, yearly: 29800 },
      description: t('pricing.plan.standard.description'),
      features: [
        t('pricing.plan.standard.feature1'),
        t('pricing.plan.standard.feature2')
      ],
      limitations: [],
      buttonText: t('pricing.plan.standard.button'),
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
            <span className="text-blue-700 text-sm font-medium">{t('pricing.badge')}</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t('pricing.title1')}
            </span>
            <br/>{t('pricing.title2')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('pricing.subtitle1')}
            <br/>{t('pricing.subtitle2')}
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
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer whitespace-nowrap relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('pricing.yearly')}
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {t('pricing.yearlyDiscount')}
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
                    {t('pricing.popular')}
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
                    /{billingPeriod === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear')}
                  </span>
                </div>
                {billingPeriod === 'yearly' && plan.price.yearly > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    {t('pricing.monthlyEquivalent')} ¥{Math.floor(plan.price.yearly / 12).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="ri-check-line text-green-500 mr-2"></i>
                  {t('pricing.features')}
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
                    {t('pricing.limitations')}
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
              <Link href="/signup">
                <button className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${plan.buttonStyle}`}>
                  {plan.buttonText}
                </button>
              </Link>

              {/* Additional info */}
              <div className="text-center mt-6 text-sm text-gray-500">
                {plan.name === t('pricing.plan.freemium.name') ? (
                  <>
                    <i className="ri-time-line mr-1"></i>
                    {t('pricing.noCard')}
                  </>
                ) : (
                  <>
                    <i className="ri-shield-check-line mr-1"></i>
                    {t('pricing.startNow')}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">{t('pricing.faqTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                {t('pricing.faq1.q')}
              </h4>
              <p className="text-gray-600 text-sm">
                {t('pricing.faq1.a')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                {t('pricing.faq2.q')}
              </h4>
              <p className="text-gray-600 text-sm">
                {t('pricing.faq2.a')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                {t('pricing.faq3.q')}
              </h4>
              <p className="text-gray-600 text-sm">
                {t('pricing.faq3.a')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="ri-question-line text-blue-500 mr-2"></i>
                {t('pricing.faq4.q')}
              </h4>
              <p className="text-gray-600 text-sm">
                {t('pricing.faq4.a')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}