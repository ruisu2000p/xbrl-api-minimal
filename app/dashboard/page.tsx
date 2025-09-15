'use client';

import { useState } from 'react';
import StatsOverview from './StatsOverview';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import AccountSettings from './AccountSettings';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">財務データ分析の概要</p>
        </div>

        <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm max-w-fit">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            概要
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeView === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            設定
          </button>
        </div>

        {activeView === 'overview' ? (
          <div className="space-y-6">
            <StatsOverview />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentActivity />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <AccountSettings />
          </div>
        )}
      </div>
    </div>
  );
}
