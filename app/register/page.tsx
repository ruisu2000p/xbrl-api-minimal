'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    plan: 'free',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // localStorageから事前入力データを取得
    const pendingEmail = localStorage.getItem('pendingEmail');
    const selectedPlan = localStorage.getItem('selectedPlan');
    
    if (pendingEmail) {
      setFormData(prev => ({ ...prev, email: pendingEmail }));
      localStorage.removeItem('pendingEmail');
    }
    if (selectedPlan) {
      setFormData(prev => ({ ...prev, plan: selectedPlan }));
      localStorage.removeItem('selectedPlan');
    }
  }, []);

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.email) {
        newErrors.email = 'メールアドレスは必須です';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '有効なメールアドレスを入力してください';
      }

      if (!formData.password) {
        newErrors.password = 'パスワードは必須です';
      } else if (formData.password.length < 8) {
        newErrors.password = 'パスワードは8文字以上にしてください';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    if (stepNumber === 2) {
      if (!formData.name) {
        newErrors.name = '名前は必須です';
      }
    }

    if (stepNumber === 3) {
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = '利用規約への同意が必要です';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setIsLoading(true);
    
    // 実際の登録処理をシミュレート
    setTimeout(() => {
      // 登録成功後、ダッシュボードへリダイレクト
      alert(`登録完了！\n\nプラン: ${formData.plan}\nメール: ${formData.email}\n\nダッシュボードへ移動します。`);
      router.push('/dashboard');
    }, 2000);
  };

  const plans = {
    free: { name: 'Free', price: '¥0', period: '1年分', api: '100回/月' },
    standard: { name: 'Standard', price: '¥1,080', period: '5年分', api: '3,000回/月' },
    pro: { name: 'Pro', price: '¥2,980', period: '20年分', api: '無制限' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">X</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              XBRL財務データAPI
            </h1>
          </div>
          <p className="text-gray-600">アカウント作成</p>
        </div>

        {/* プログレスバー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 mx-1`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 mx-1`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span className={step === 1 ? 'font-bold text-blue-600' : ''}>アカウント情報</span>
            <span className={step === 2 ? 'font-bold text-blue-600' : ''}>プロフィール</span>
            <span className={step === 3 ? 'font-bold text-blue-600' : ''}>プラン選択</span>
          </div>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: アカウント情報 */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">アカウント情報</h2>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="8文字以上"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                  
                  {/* パスワード強度インジケーター */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 12 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 16 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        パスワード強度: {
                          formData.password.length < 8 ? '弱い' :
                          formData.password.length < 12 ? '普通' :
                          formData.password.length < 16 ? '強い' : 'とても強い'
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード（確認）
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="パスワードを再入力"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  次へ →
                </button>
              </div>
            )}

            {/* Step 2: プロフィール */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">プロフィール</h2>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    お名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="山田 太郎"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    会社名 <span className="text-gray-400">（任意）</span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="株式会社〇〇"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">ヒント:</span> プロフィール情報は後からダッシュボードで変更できます。
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    ← 戻る
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    次へ →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: プラン選択 */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">プランを選択</h2>
                
                <div className="space-y-4">
                  {Object.entries(plans).map(([key, plan]) => (
                    <label
                      key={key}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.plan === key
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={key}
                        checked={formData.plan === key}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          <p className="text-gray-600 text-sm">
                            {plan.period}のデータ • {plan.api}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{plan.price}</p>
                          <p className="text-sm text-gray-500">/月</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">🎉 キャンペーン中:</span> 今なら全プラン初月無料！
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-600">
                      <a href="/terms" className="text-blue-600 hover:underline" target="_blank">利用規約</a>および
                      <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">プライバシーポリシー</a>に同意します
                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    ← 戻る
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        登録中...
                      </span>
                    ) : (
                      '登録する'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ログインリンク */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちですか？{' '}
            <a href="/login" className="text-blue-600 hover:underline font-semibold">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}