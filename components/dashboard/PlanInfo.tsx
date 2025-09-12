'use client'

import { useState, useEffect } from 'react'

const plans = {
  free: {
    name: '無料プラン',
    price: '¥0',
    limits: {
      hourly: 100,
      daily: 1000,
      monthly: 10000
    },
    features: [
      '基本API アクセス',
      '1年分のデータ',
      'コミュニティサポート'
    ]
  },
  basic: {
    name: 'Basic',
    price: '¥5,000/月',
    limits: {
      hourly: 500,
      daily: 5000,
      monthly: 50000
    },
    features: [
      '全API アクセス',
      '3年分のデータ',
      'メールサポート',
      'Webhook対応'
    ]
  },
  pro: {
    name: 'Pro',
    price: '¥20,000/月',
    limits: {
      hourly: 2000,
      daily: 20000,
      monthly: 200000
    },
    features: [
      '全API アクセス',
      '全期間データ',
      '優先サポート',
      'SLA保証',
      'カスタムフィールド'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 'お問い合わせ',
    limits: {
      hourly: 10000,
      daily: 100000,
      monthly: 1000000
    },
    features: [
      'カスタマイズ可能',
      '専任サポート',
      'オンプレミス対応',
      '無制限アクセス'
    ]
  }
}

export default function PlanInfo() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [usage, setUsage] = useState({
    hourly: 0,
    daily: 0,
    monthly: 0
  })

  useEffect(() => {
    // TODO: 実際のプラン情報を取得
    fetchPlanInfo()
  }, [])

  const fetchPlanInfo = async () => {
    // プラン情報の取得（仮実装）
    // const response = await fetch('/api/dashboard/plan')
    // const data = await response.json()
    // setCurrentPlan(data.plan)
    // setUsage(data.usage)
  }

  const plan = plans[currentPlan as keyof typeof plans]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">現在のプラン</h2>
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-blue-600">{plan.name}</h3>
        <p className="text-gray-600">{plan.price}</p>
      </div>

      {/* 使用量メーター */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">時間あたり</span>
            <span className="font-medium">{usage.hourly} / {plan.limits.hourly}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((usage.hourly / plan.limits.hourly) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">日あたり</span>
            <span className="font-medium">{usage.daily} / {plan.limits.daily}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((usage.daily / plan.limits.daily) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">月あたり</span>
            <span className="font-medium">{usage.monthly} / {plan.limits.monthly}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((usage.monthly / plan.limits.monthly) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* プラン機能 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">含まれる機能:</h4>
        <ul className="space-y-1">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm">
              <svg
                className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* アップグレードボタン */}
      {currentPlan !== 'enterprise' && (
        <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors">
          プランをアップグレード
        </button>
      )}
    </div>
  )
}