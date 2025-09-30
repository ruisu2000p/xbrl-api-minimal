
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = supabaseManager.getBrowserClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(t('login2.error.invalid'));
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Cookie同期
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
          }),
          credentials: 'include'
        });

        // ダッシュボードにリダイレクト
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
      setError(t('login2.error.general'));
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
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {t('login2.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 mb-4">
              {t('login2.orCreate')}{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                {t('login2.createAccount')}
              </Link>
            </p>
            <button
              onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Switch language"
            >
              <i className="ri-translate-2 text-gray-600"></i>
              <span className="text-sm font-medium text-gray-700">{language === 'ja' ? 'EN' : 'JA'}</span>
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login2.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900 placeholder:text-gray-500"
                  placeholder={t('login2.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login2.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900 placeholder:text-gray-500"
                    placeholder={t('login2.passwordPlaceholder')}
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
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    {t('login2.rememberMe')}
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                    {t('login2.forgotPassword')}
                  </Link>
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
                      {t('login2.loggingIn')}
                    </div>
                  ) : (
                    t('login2.loginButton')
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t('login2.noAccount')}{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                {t('login2.signupLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
