
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    position: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    notInvestmentAdvice: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.firstName.trim()) newErrors.firstName = '姓を入力してください';
    if (!formData.lastName.trim()) newErrors.lastName = '名を入力してください';
    if (!formData.email.trim()) newErrors.email = 'メールアドレスを入力してください';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = '有効なメールアドレスを入力してください';
    if (formData.password.length < 8) newErrors.password = 'パスワードは8文字以上で入力してください';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'パスワードが一致しません';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = '利用規約に同意してください';
    if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = 'プライバシーポリシーに同意してください';
    if (!formData.notInvestmentAdvice) newErrors.notInvestmentAdvice = '投資助言に関する確認事項に同意してください';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
    
    try {
      // フォームデータの準備
      const submitData = new URLSearchParams();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      submitData.append('company', formData.company);
      submitData.append('position', formData.position);
      submitData.append('agreeToTerms', formData.agreeToTerms ? 'true' : 'false');
      submitData.append('agreeToPrivacy', formData.agreeToPrivacy ? 'true' : 'false');
      submitData.append('notInvestmentAdvice', formData.notInvestmentAdvice ? 'true' : 'false');

      const response = await fetch('https://readdy.ai/api/form/d33sddqr9t98gmi31tgg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: submitData.toString()
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('アカウント登録の申し込みを受け付けました。確認メールをお送りします。');
        
        // フォームをリセット
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          company: '',
          position: '',
          agreeToTerms: false,
          agreeToPrivacy: false,
          notInvestmentAdvice: false
        });
      } else {
        setSubmitStatus('error');
        setSubmitMessage('送信に失敗しました。しばらく時間をおいて再度お試しください。');
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('送信エラーが発生しました。インターネット接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              無料アカウントを作成
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                こちらからログイン
              </Link>
            </p>
          </div>
          
          {/* ステータスメッセージ */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="ri-check-circle-line text-green-500 text-xl mr-3"></i>
                <p className="text-green-800">{submitMessage}</p>
              </div>
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="ri-error-warning-line text-red-500 text-xl mr-3"></i>
                <p className="text-red-800">{submitMessage}</p>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form className="space-y-6" onSubmit={handleSubmit} data-readdy-form id="signup-form">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    姓 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                    placeholder="山田"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                    placeholder="太郎"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    会社名
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="株式会社サンプル"
                  />
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                    役職
                  </label>
                  <div className="relative">
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer"
                    >
                      <option value="">役職を選択してください</option>
                      <option value="代表取締役">代表取締役</option>
                      <option value="取締役">取締役</option>
                      <option value="執行役員">執行役員</option>
                      <option value="部長">部長</option>
                      <option value="課長">課長</option>
                      <option value="係長">係長</option>
                      <option value="主任">主任</option>
                      <option value="マネージャー">マネージャー</option>
                      <option value="チームリーダー">チームリーダー</option>
                      <option value="営業部長">営業部長</option>
                      <option value="財務部長">財務部長</option>
                      <option value="経理部長">経理部長</option>
                      <option value="人事部長">人事部長</option>
                      <option value="総務部長">総務部長</option>
                      <option value="企画部長">企画部長</option>
                      <option value="開発部長">開発部長</option>
                      <option value="マーケティング部長">マーケティング部長</option>
                      <option value="コンサルタント">コンサルタント</option>
                      <option value="アナリスト">アナリスト</option>
                      <option value="専門職">専門職</option>
                      <option value="一般職">一般職</option>
                      <option value="その他">その他</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* パスワード */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                      placeholder="8文字以上"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 cursor-pointer"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                      </div>
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード確認 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                      placeholder="パスワードを再入力"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 cursor-pointer"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i className={showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                      </div>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* 同意事項 */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">同意事項</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      id="agreeToTerms"
                      name="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1"
                    />
                    <label htmlFor="agreeToTerms" className="ml-3 text-sm text-gray-700 cursor-pointer">
                      <Link href="/terms" className="text-blue-600 hover:text-blue-500">利用規約</Link>に同意します <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {errors.agreeToTerms && <p className="ml-7 text-sm text-red-500">{errors.agreeToTerms}</p>}

                  <div className="flex items-start">
                    <input
                      id="agreeToPrivacy"
                      name="agreeToPrivacy"
                      type="checkbox"
                      checked={formData.agreeToPrivacy}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1"
                    />
                    <label htmlFor="agreeToPrivacy" className="ml-3 text-sm text-gray-700 cursor-pointer">
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-500">プライバシーポリシー</Link>に同意します <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {errors.agreeToPrivacy && <p className="ml-7 text-sm text-red-500">{errors.agreeToPrivacy}</p>}

                  <div className="flex items-start bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <input
                      id="notInvestmentAdvice"
                      name="notInvestmentAdvice"
                      type="checkbox"
                      checked={formData.notInvestmentAdvice}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1 flex-shrink-0"
                    />
                    <label htmlFor="notInvestmentAdvice" className="ml-3 text-sm text-gray-700 cursor-pointer">
                      <div className="font-medium text-yellow-800 mb-1">
                        <i className="ri-alert-line mr-1"></i>
                        投資助言に関する重要な確認事項 <span className="text-red-500">*</span>
                      </div>
                      <div className="text-gray-600">
                        本サービスで提供される情報は、投資判断の参考となる情報の提供を目的としたものであり、投資勧誘や投資助言を行うものではありません。最終的な投資判断は、利用者ご自身の責任において行っていただくものとします。この点について理解し、同意します。
                      </div>
                    </label>
                  </div>
                  {errors.notInvestmentAdvice && <p className="ml-7 text-sm text-red-500">{errors.notInvestmentAdvice}</p>}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      送信中...
                    </div>
                  ) : (
                    'アカウントを作成'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                こちらからログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
