'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check for verification errors from the API route
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      setSubmitStatus('error');
      if (error === 'missing_token') {
        setSubmitMessage('パスワードリセットリンクが不正です。 / Invalid reset link.');
      } else if (error === 'verification_failed') {
        setSubmitMessage(`認証に失敗しました。 / Verification failed: ${message || 'Unknown error'}`);
      } else if (error === 'no_session') {
        setSubmitMessage('セッションの確立に失敗しました。 / Failed to establish session.');
      } else {
        setSubmitMessage('パスワードリセットリンクが無効または期限切れです。再度リセットリクエストをお願いします。 / Reset link is invalid or expired. Please request a new reset link.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password.length < 8) {
      setSubmitStatus('error');
      setSubmitMessage('パスワードは8文字以上で設定してください。 / Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitStatus('error');
      setSubmitMessage('パスワードが一致しません。 / Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setSubmitStatus('error');
        setSubmitMessage(`パスワードの更新に失敗しました。 / Failed to update password: ${error.message}`);
      } else {
        setSubmitStatus('success');
        setSubmitMessage('パスワードを正常に更新しました。ログインページへ移動します… / Password updated successfully. Redirecting to login…');
        setPassword('');
        setConfirmPassword('');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?password_reset=1');
        }, 2000);
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('予期しないエラーが発生しました。 / An unexpected error occurred.');
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
              新しいパスワードを設定 / Set New Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              8文字以上の安全なパスワードを入力してください。
              <br />
              Please enter a secure password (at least 8 characters).
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
                <p className="text-red-800 text-sm">{submitMessage}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  新しいパスワード / New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? 'ri-eye-off-line text-lg' : 'ri-eye-line text-lg'}></i>
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  最低8文字 / Minimum 8 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード確認 / Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showConfirmPassword ? 'ri-eye-off-line text-lg' : 'ri-eye-line text-lg'}></i>
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !password.trim() || !confirmPassword.trim() || submitStatus === 'success'}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors cursor-pointer whitespace-nowrap disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      更新中… / Updating…
                    </div>
                  ) : submitStatus === 'success' ? (
                    <div className="flex items-center">
                      <i className="ri-check-line mr-2"></i>
                      完了 / Done
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <i className="ri-lock-line mr-2"></i>
                      パスワードを更新 / Update Password
                    </div>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                  ← ログインページに戻る / Back to Login
                </Link>
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">
              <i className="ri-shield-check-line mr-2"></i>
              パスワードのヒント / Password Tips
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 大文字と小文字を組み合わせる / Mix uppercase and lowercase</li>
              <li>• 数字や記号を含める / Include numbers or symbols</li>
              <li>• 他のサイトと同じパスワードは避ける / Avoid reusing passwords</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
