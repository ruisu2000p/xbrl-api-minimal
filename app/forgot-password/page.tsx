'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
    
    try {
      // フォームデータの準備
      const submitData = new URLSearchParams();
      submitData.append('email', email);

      const response = await fetch('https://readdy.ai/api/form/d33so10ahuop1eu2ivig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: submitData.toString()
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('パスワードリセットの案内メールを送信しました。メールをご確認ください。');
        setEmail('');
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
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-lock-password-line text-blue-600 text-2xl"></i>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              パスワードをリセット
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              登録済みのメールアドレスを入力してください。
              <br />
              パスワードリセット用のリンクをお送りします。
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
            <form className="space-y-6" onSubmit={handleSubmit} data-readdy-form id="forgot-password-form">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors cursor-pointer whitespace-nowrap disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      送信中...
                    </div>
                  ) : (
                    'リセットリンクを送信'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                パスワードを思い出しましたか？{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                  ログインページに戻る
                </Link>
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">
              <i className="ri-information-line mr-2"></i>
              ご注意
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• メールが届かない場合は、迷惑メールフォルダもご確認ください</li>
              <li>• リセットリンクの有効期限は24時間です</li>
              <li>• 複数回送信しても問題ありません</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                こちらから無料登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}