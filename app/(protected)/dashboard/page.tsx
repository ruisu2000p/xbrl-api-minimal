'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AccountSettings from './AccountSettings';
import { ApiKeyModal } from '@/app/components/ApiKeyModal';
import AuthDisplay from '@/components/AuthDisplay';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">アカウント設定と管理機能</p>
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
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}