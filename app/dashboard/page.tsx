import AccountSettings from './AccountSettings';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">アカウント設定と管理機能</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <AccountSettings />
        </div>
      </div>
    </div>
  );
}
