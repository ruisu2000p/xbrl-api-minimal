'use client';

import { useState } from 'react';
import StatsOverview from './StatsOverview';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import DashboardStats from './DashboardStats';
import DataChart from './DataChart';
import AccountSettings from './AccountSettings';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('7days');

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
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeView === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            分析
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

        {activeView === 'overview' && (
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
        )}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DataChart selectedPeriod={selectedPeriod} />
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">期間選択</h3>
                  <div className="space-y-2">
                    {['7days', '30days', '90days', '1year'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedPeriod === period
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {period === '7days' && '過去7日間'}
                        {period === '30days' && '過去30日間'}
                        {period === '90days' && '過去90日間'}
                        {period === '1year' && '過去1年間'}
                      </button>
                    ))}
                  </div>
                </div>
                <QuickActions />
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <AccountSettings />
          </div>
        )}
      </div>
    </div>
  );
}
