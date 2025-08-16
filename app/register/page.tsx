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
    plan: 'beta',
    agreeToTerms: false,
    agreeToDisclaimer: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // localStorageから事前入力データを取征E    const pendingEmail = localStorage.getItem('pendingEmail');
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
        newErrors.email = 'メールアドレスは忁E��でぁE;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '有効なメールアドレスを�E力してください';
      }

      if (!formData.password) {
        newErrors.password = 'パスワード�E忁E��でぁE;
      } else if (formData.password.length < 8) {
        newErrors.password = 'パスワード�E8斁E��以上にしてください';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    if (stepNumber === 2) {
      if (!formData.name) {
        newErrors.name = '名前は忁E��でぁE;
      }
    }

    if (stepNumber === 3) {
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = '利用規紁E��の同意が忁E��でぁE;
      }
      if (!formData.agreeToDisclaimer) {
        newErrors.agreeToDisclaimer = '免責事頁E��の同意が忁E��でぁE;
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
    
    try {
      // 実際のAPI呼び出ぁE      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          company: formData.company,
          plan: formData.plan,
          agreeToTerms: formData.agreeToTerms,
          agreeToDisclaimer: formData.agreeToDisclaimer
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      // 登録成功時�E処琁E      if (data.success) {
        // ユーザーチE�EタをLocalStorageに保存！Eelcomeペ�Eジで使用�E�E        localStorage.setItem('registrationData', JSON.stringify(data.user));
        
        // welcomeペ�EジへリダイレクチE        router.push('/welcome');
      }
    } catch (error) {
      setIsLoading(false);
      
      // エラーメチE��ージの表示
      if (error instanceof Error) {
        if (error.message.includes('既に登録')) {
          setErrors({ email: 'こ�Eメールアドレスは既に登録されてぁE��ぁE });
          setStep(1); // Step 1に戻めE        } else {
          alert(`登録エラー: ${error.message}`);
        }
      } else {
        alert('予期しなぁE��ラーが発生しました。もぁE��度お試しください、E);
      }
    }
  };

  const plans = {
    beta: { name: 'ベ�Eタアクセス', price: '¥0', period: '20年刁E, api: '1,000囁E朁E, description: '現在ベ�Eタ版�E完�E無斁E }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            XBRL財務データAPI
          </h1>
          <p className="text-gray-600">アカウント作�E</p>
        </div>

        {/* プログレスバ�E */}
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
            <span className={step === 3 ? 'font-bold text-blue-600' : ''}>確誁E/span>
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
                    パスワーチE                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="8斁E��以丁E
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
                          formData.password.length < 8 ? '弱ぁE :
                          formData.password.length < 12 ? '普送E :
                          formData.password.length < 16 ? '強ぁE : 'とても強ぁE
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード（確認！E                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="パスワードを再�E劁E
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  次へ ↁE                </button>
              </div>
            )}

            {/* Step 2: プロフィール */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">プロフィール</h2>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    お名剁E<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="山田 太郁E
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    会社吁E<span className="text-gray-400">�E�任意！E/span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="株式会社、E��E
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">ヒンチE</span> プロフィール惁E��は後からダチE��ュボ�Eドで変更できます、E                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    ↁE戻めE                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    次へ ↁE                  </button>
                </div>
              </div>
            )}

            {/* Step 3: ベ�Eタ版確誁E*/}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">ベ�Eタ版へようこそ</h2>
                
                {/* ベ�Eタ版�E特典表示 */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="flex items-center mb-4">
                    <div className="bg-white/20 rounded-full px-4 py-1 text-sm font-bold">
                      🚀 ベ�Eタ限宁E                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">ベ�Eタアクセス</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>全20年刁E�EチE�Eタアクセス</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>1,000囁E月�EAPI呼び出ぁE/span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>全機�Eへのフルアクセス</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>正式版での特別価格適用</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <div className="text-3xl font-bold">¥0<span className="text-lg font-normal">/朁E/span></div>
                    <p className="text-sm opacity-90 mt-1">正式版まで完�E無斁E/p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">📧 お知らせ:</span> 正式版リリース時�E事前にメールでお知らせし、�Eータ参加老E��定�E特別価格をご案�Eします、E                  </p>
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
                      <a href="/terms" className="text-blue-600 hover:underline" target="_blank">利用規紁E/a>および
                      <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">プライバシーポリシー</a>に同意しまぁE                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}

                  {/* 投賁E��言免責事頁E*/}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">⚠�E�E重要な免責事頁E/h4>
                    <div className="text-sm text-gray-700 space-y-2 mb-3">
                      <p>本サービスは以下�E点につぁE��ご理解ぁE��だく忁E��があります！E/p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>提供するデータは<strong>惁E��提供�Eみ</strong>を目皁E��してぁE��ぁE/li>
                        <li><strong>投賁E��言・投賁E��誘を行うも�Eではありません</strong></li>
                        <li>投賁E��断は忁E��ご�E身の責任で行ってください</li>
                        <li>チE�Eタ利用による損失につぁE��一刁E��任を負ぁE��せん</li>
                        <li>金融啁E��取引法に基づく投賁E��言業の登録は行っておりません</li>
                      </ul>
                    </div>
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.agreeToDisclaimer}
                        onChange={(e) => setFormData({ ...formData, agreeToDisclaimer: e.target.checked })}
                        className="mt-1 mr-3"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        上記�E免責事頁E��琁E��し、本サービスが投賁E��言ではなぁE��とに同意しまぁE                      </span>
                    </label>
                  </div>
                  {errors.agreeToDisclaimer && <p className="text-sm text-red-500">{errors.agreeToDisclaimer}</p>}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    ↁE戻めE                  </button>
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
            すでにアカウントをお持ちですか�E�{' '}
            <a href="/login" className="text-blue-600 hover:underline font-semibold">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
