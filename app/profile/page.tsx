'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  department?: string;
  position?: string;
  website?: string;
  bio?: string;
  plan?: string;
  createdAt?: string;
  lastLoginAt?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  apiUsage?: {
    currentMonth: number;
    lastMonth: number;
    total: number;
  };
  preferences?: {
    newsletter: boolean;
    productUpdates: boolean;
    securityAlerts: boolean;
    usageAlerts: boolean;
    language: string;
    timezone: string;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'billing'>('general');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      // デフォルト値を設定
      const enrichedUser = {
        ...userData,
        phone: userData.phone || '',
        department: userData.department || '',
        position: userData.position || '',
        website: userData.website || '',
        bio: userData.bio || '',
        emailVerified: userData.emailVerified ?? true,
        twoFactorEnabled: userData.twoFactorEnabled ?? false,
        apiUsage: userData.apiUsage || {
          currentMonth: 245,
          lastMonth: 189,
          total: 1523
        },
        preferences: userData.preferences || {
          newsletter: true,
          productUpdates: true,
          securityAlerts: true,
          usageAlerts: false,
          language: 'ja',
          timezone: 'Asia/Tokyo'
        },
        lastLoginAt: userData.lastLoginAt || new Date().toISOString()
      };
      setUser(enrichedUser);
      setFormData(enrichedUser);
      setLoading(false);
    } else {
      router.push('/login');
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // APIコール（実際の実装では適切なエンドポイントを使用）
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = { ...user, ...formData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setEditMode(false);
        setMessage({ type: 'success', text: 'プロフィールを更新しました' });
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'パスワードが一致しません' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'パスワードは8文字以上にしてください' });
      return;
    }

    setSaving(true);
    try {
      // パスワード変更API
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'パスワードを変更しました' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error('パスワード変更に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '現在のパスワードが正しくありません' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // アカウント削除処理
    router.push('/delete');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900 text-sm sm:text-base">
                <span className="hidden sm:inline">← ダッシュボードに戻る</span>
                <span className="sm:hidden">← 戻る</span>
              </button>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <h1 className="text-lg sm:text-xl font-bold">プロフィール設定</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* プロフィールヘッダー */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl sm:text-3xl font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name || 'ユーザー名未設定'}</h2>
              <p className="text-gray-600 text-sm sm:text-base">{user.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-4 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                  {user.plan === 'beta' ? 'ベータプラン' : user.plan || 'Free'}
                </span>
                {user.emailVerified && (
                  <span className="inline-flex items-center text-xs sm:text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    メール認証済み
                  </span>
                )}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="grid grid-cols-2 sm:block gap-4 sm:gap-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">メンバー登録日</p>
                  <p className="text-sm sm:text-base font-medium">{new Date(user.createdAt || Date.now()).toLocaleDateString('ja-JP')}</p>
                </div>
                <div className="sm:mt-2">
                  <p className="text-xs sm:text-sm text-gray-500">最終ログイン</p>
                  <p className="text-sm sm:text-base font-medium">{new Date(user.lastLoginAt || Date.now()).toLocaleDateString('ja-JP')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'general', label: '基本情報', icon: '👤' },
                { id: 'security', label: 'セキュリティ', icon: '🔒' },
                { id: 'notifications', label: '通知設定', icon: '🔔' },
                { id: 'billing', label: '請求・プラン', icon: '💳' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* 基本情報タブ */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">基本情報</h3>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      編集
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setFormData(user);
                          setEditMode(false);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">氏名</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">メールアドレスは変更できません</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">会社名</label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">部署</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">役職</label>
                    <input
                      type="text"
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ウェブサイト</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      disabled={!editMode}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">自己紹介</label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!editMode}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      placeholder="簡単な自己紹介を入力してください"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* セキュリティタブ */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">セキュリティ設定</h3>

                {/* パスワード変更 */}
                <div className="border-b pb-6">
                  <h4 className="font-medium mb-4">パスワード変更</h4>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">現在のパスワード</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">新しいパスワード</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">新しいパスワード（確認）</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? '変更中...' : 'パスワードを変更'}
                    </button>
                  </div>
                </div>

                {/* 2段階認証 */}
                <div className="border-b pb-6">
                  <h4 className="font-medium mb-4">2段階認証</h4>
                  <div className="flex items-center justify-between max-w-md">
                    <div>
                      <p className="text-sm text-gray-600">アカウントのセキュリティを強化します</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.twoFactorEnabled ? '2段階認証は有効です' : '2段階認証は無効です'}
                      </p>
                    </div>
                    <button
                      className={`px-4 py-2 rounded-lg ${
                        user.twoFactorEnabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {user.twoFactorEnabled ? '無効にする' : '有効にする'}
                    </button>
                  </div>
                </div>

                {/* セッション管理 */}
                <div>
                  <h4 className="font-medium mb-4">アクティブなセッション</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium">現在のセッション</p>
                          <p className="text-sm text-gray-500">Windows • Chrome • 東京</p>
                        </div>
                      </div>
                      <span className="text-sm text-green-600">アクティブ</span>
                    </div>
                  </div>
                  <button className="mt-4 text-sm text-blue-600 hover:underline">
                    他のすべてのセッションからログアウト
                  </button>
                </div>
              </div>
            )}

            {/* 通知設定タブ */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">通知設定</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'newsletter', label: 'ニュースレター', description: '新機能やアップデート情報をお届けします' },
                    { key: 'productUpdates', label: '製品アップデート', description: 'APIの更新や変更に関する重要な通知' },
                    { key: 'securityAlerts', label: 'セキュリティアラート', description: 'アカウントの安全に関する通知' },
                    { key: 'usageAlerts', label: '使用量アラート', description: 'API使用量が制限に近づいた際の通知' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.preferences?.[item.key as keyof typeof formData.preferences] as boolean || false}
                          onChange={(e) => setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences!,
                              [item.key]: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '設定を保存'}
                </button>
              </div>
            )}

            {/* 請求・プランタブ */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">請求・プラン情報</h3>

                {/* 現在のプラン */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg sm:text-xl font-bold mb-2">ベータアクセスプラン</h4>
                      <p className="text-blue-100 mb-4 text-sm sm:text-base">現在ベータ版として無料でご利用いただけます</p>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>API呼び出し: 1,000回/月</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>20年分のデータアクセス</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>全機能へのフルアクセス</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl sm:text-3xl font-bold">¥0</p>
                      <p className="text-xs sm:text-sm text-blue-100">/月</p>
                    </div>
                  </div>
                </div>

                {/* 使用状況 */}
                <div>
                  <h4 className="font-medium mb-4">今月の使用状況</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{user.apiUsage?.currentMonth || 245}</p>
                      <p className="text-sm text-gray-600">API呼び出し</p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${((user.apiUsage?.currentMonth || 245) / 1000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{user.apiUsage?.lastMonth || 189}</p>
                      <p className="text-sm text-gray-600">先月の使用量</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{user.apiUsage?.total || 1523}</p>
                      <p className="text-sm text-gray-600">合計使用量</p>
                    </div>
                  </div>
                </div>

                {/* アップグレード */}
                <div className="p-6 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">正式版リリース予定</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    正式版では、より高度な機能と大容量のAPIコールが可能な有料プランをご用意します。
                    ベータ参加者には特別割引を適用予定です。
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    プラン詳細を見る
                  </button>
                </div>

                {/* 危険ゾーン */}
                <div className="border-t pt-6">
                  <h4 className="text-red-600 font-medium mb-4">危険ゾーン</h4>
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      アカウントを削除すると、すべてのデータとAPIキーが永久に削除されます。
                      この操作は取り消すことができません。
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      アカウントを削除
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* アカウント削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">本当にアカウントを削除しますか？</h3>
            <p className="text-gray-600 mb-6">
              この操作は取り消せません。すべてのデータ、APIキー、設定が永久に削除されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}