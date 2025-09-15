'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '@/app/actions/auth';

export default function SignupPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    agreeToTerms: false,
    understandInvestmentAdvice: false
  });

  const plans = [
    {
      id: 'freemium',
      name: 'フリーミアム',
      price: { monthly: 0, yearly: 0 },
      description: '直近1年間のデータに限定アクセス',
      features: ['直近1年間の財務データアクセス'],
      icon: 'ri-seedling-line',
      gradient: 'from-emerald-400 to-emerald-600',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      bgColor: 'bg-emerald-50/50',
      glowColor: 'shadow-emerald-200/50'
    },
    {
      id: 'standard',
      name: 'スタンダード',
      price: { monthly: 2980, yearly: 29800 },
      description: 'すべてのデータに無制限アクセス',
      features: ['全期間の財務データアクセス', 'APIアクセス'],
      icon: 'ri-vip-crown-line',
      gradient: 'from-blue-500 to-purple-600',
      borderColor: 'border-blue-200 hover:border-blue-300',
      bgColor: 'bg-gradient-to-br from-blue-50/50 to-purple-50/50',
      glowColor: 'shadow-blue-200/50',
      recommended: true
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    if (!formData.agreeToTerms) {
      setError('利用規約に同意してください');
      return;
    }
    if (!formData.understandInvestmentAdvice) {
      setError('投資助言に関する注意事項をご確認ください');
      return;
    }
    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company,
        plan: selectedPlan,
        billingPeriod: billingPeriod
      });

      if (result.success) {
        // Redirect to dashboard or confirmation page
        router.push('/dashboard');
      } else {
        setError(result.error || 'アカウント作成に失敗しました');
      }
    } catch (err) {
      setError('アカウント作成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    return plan?.id === 'freemium' ? '無料アカウントを作成' : 'アカウント作成';
  };

  const formatPrice = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return '¥0';

    const price = plan.price[billingPeriod];
    if (price === 0) return '¥0';

    return `¥${price.toLocaleString()}`;
  };

  const getPeriodText = () => {
    return billingPeriod === 'monthly' ? '/月' : '/年';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-blue-200/50">
            <i className="ri-user-add-line text-white text-2xl"></i>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
            アカウント作成
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            財務データAPIの利用を開始して、ビジネスの可能性を広げましょう
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
          {/* プラン選択 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 p-10 border border-white/50">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl mb-4 shadow-lg">
                <i className="ri-vip-crown-2-line text-white text-xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">プランを選択</h2>
              <p className="text-gray-600">あなたのビジネスに最適なプランをお選びください</p>
            </div>

            {/* 請求期間切り替え */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 rounded-2xl p-1">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 cursor-pointer whitespace-nowrap text-sm ${
                      billingPeriod === 'monthly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    月額
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 cursor-pointer whitespace-nowrap text-sm relative ${
                      billingPeriod === 'yearly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    年額
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      20%お得
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-8 rounded-3xl border-2 cursor-pointer transition-all duration-500 group ${
                    selectedPlan === plan.id
                      ? `${plan.borderColor} ${plan.bgColor} shadow-2xl ${plan.glowColor} transform scale-[1.02]`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                        <i className="ri-star-fill mr-1"></i>
                        おすすめ
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <i className={`${plan.icon} text-white text-xl`}></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                        <p className="text-gray-600 text-sm">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{formatPrice(plan.id)}</span>
                        <span className="text-gray-500 ml-1 text-sm">{getPeriodText()}</span>
                      </div>
                      {billingPeriod === 'yearly' && plan.price.yearly > 0 && (
                        <div className="text-sm text-green-600 font-medium mt-1">
                          月額換算 ¥{Math.floor(plan.price.yearly / 12).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-check-line text-green-600 text-xs"></i>
                        </div>
                        <span className="text-gray-700 text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      selectedPlan === plan.id
                        ? 'border-blue-600 bg-blue-600 shadow-lg shadow-blue-200/50'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {selectedPlan === plan.id && (
                        <i className="ri-check-line text-white text-sm"></i>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 登録フォーム */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 p-10 border border-white/50">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4 shadow-lg">
                <i className="ri-user-line text-white text-xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">アカウント情報</h2>
              <p className="text-gray-600">必要な情報を入力してください</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center">
                  <i className="ri-error-warning-line text-red-500 text-lg mr-3"></i>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-user-line mr-2 text-gray-500"></i>
                    お名前 *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-300"
                    placeholder="山田太郎"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-building-line mr-2 text-gray-500"></i>
                    会社名
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-300"
                    placeholder="株式会社サンプル"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-mail-line mr-2 text-gray-500"></i>
                  メールアドレス *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-300"
                  placeholder="example@company.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-lock-line mr-2 text-gray-500"></i>
                    パスワード *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-300"
                    placeholder="8文字以上のパスワード"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-lock-2-line mr-2 text-gray-500"></i>
                    パスワード確認 *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-300"
                    placeholder="パスワードを再入力"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-200">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                  <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-2">
                    利用規約
                  </Link>
                  と
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-2">
                    プライバシーポリシー
                  </Link>
                  に同意します
                </label>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <input
                  id="understandInvestmentAdvice"
                  name="understandInvestmentAdvice"
                  type="checkbox"
                  checked={formData.understandInvestmentAdvice}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 text-amber-600 border-amber-300 rounded-lg focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="understandInvestmentAdvice" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                  <div className="flex items-start space-x-2">
                    <i className="ri-alert-line text-amber-600 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <span className="font-semibold text-amber-800">投資助言に関する重要な注意事項</span>
                      <div className="mt-1 text-gray-600">
                        当サービスは投資助言業ではなく、情報提供のみを行います。投資判断はお客様ご自身の責任で行ってください。データの正確性は保証されません。
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={!formData.agreeToTerms || !formData.understandInvestmentAdvice || isLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      アカウントを作成中...
                    </>
                  ) : (
                    getButtonText()
                  )}
                </button>
              </div>

              <div className="text-center text-sm text-gray-600">
                すでにアカウントをお持ちですか？{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  ログイン
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          </div>
        </div>

      </div>
    </div>
  );
}