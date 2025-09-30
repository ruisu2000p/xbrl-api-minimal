'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AccountSettings from './AccountSettings';
import { ApiKeyModal } from '@/app/components/ApiKeyModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupabase } from '@/components/SupabaseProvider';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { supabase } = useSupabase();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    // 新規アカウント作成後の場合、セッションストレージからAPIキーを取得
    const isNewAccount = searchParams.get('newAccount') === 'true';

    if (isNewAccount) {
      // 少し遅延を入れて、ページが完全に読み込まれてからモーダルを表示
      const timer = setTimeout(() => {
        const storedKey = sessionStorage.getItem('newApiKey');
        if (storedKey) {
          setNewApiKey(storedKey);
          setShowApiKeyModal(true);
          // 一度表示したら削除
          sessionStorage.removeItem('newApiKey');

          // URLパラメータもクリア（リロード時に再表示されないように）
          window.history.replaceState({}, '', '/dashboard');
        }
      }, 500); // 0.5秒後に表示

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ダッシュボードヘッダー */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <i className="ri-bank-line text-white text-lg"></i>
              </div>
              <div>
                <div className="font-pacifico text-xl text-gray-900">Financial Information next</div>
                <div className="text-xs text-gray-500 font-medium">FIN</div>
              </div>
            </Link>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors font-medium"
                aria-label="Switch language"
              >
                {language === 'ja' ? 'EN' : 'JA'}
              </button>
              <button
                onClick={handleLogout}
                className="border-2 border-gray-300 text-gray-700 hover:border-red-600 hover:text-red-600 px-5 py-2 rounded-lg transition-all duration-300 font-medium"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-600 mt-2">{t('dashboard.subtitle')}</p>
          </div>

        {/* JWT認証状態表示 (v8.0.0以降は不要) */}
        {/*
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">JWT認証状態</h2>
            <AuthDisplay />
          </div>
        </div>
        */}

          <div className="max-w-4xl mx-auto">
            <AccountSettings />
          </div>
        </div>

        {/* 新規アカウント作成時のAPIキーモーダル */}
        {showApiKeyModal && newApiKey && (
          <ApiKeyModal
            apiKey={newApiKey}
            onClose={() => setShowApiKeyModal(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}