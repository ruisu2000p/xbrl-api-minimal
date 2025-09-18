'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Settings {
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    darkMode: boolean;
  };
  api: {
    defaultVersion: string;
    responseFormat: string;
    rateLimit: number;
    timeout: number;
    retryAttempts: number;
    webhookUrl: string;
    allowedIPs: string[];
  };
  notifications: {
    email: {
      apiErrors: boolean;
      usageAlerts: boolean;
      weeklyReport: boolean;
      monthlyReport: boolean;
      maintenance: boolean;
    };
    alertThresholds: {
      usage: number;
      errors: number;
      latency: number;
    };
  };
  security: {
    apiKeyExpiry: number;
    ipWhitelist: boolean;
    requireHttps: boolean;
    logRetention: number;
    auditLog: boolean;
  };
  advanced: {
    debugMode: boolean;
    verboseLogging: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
    compressionEnabled: boolean;
    customHeaders: Record<string, string>;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    general: {
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY-MM-DD',
      currency: 'JPY',
      darkMode: false
    },
    api: {
      defaultVersion: 'v1',
      responseFormat: 'json',
      rateLimit: 1000,
      timeout: 30000,
      retryAttempts: 3,
      webhookUrl: '',
      allowedIPs: []
    },
    notifications: {
      email: {
        apiErrors: true,
        usageAlerts: true,
        weeklyReport: false,
        monthlyReport: true,
        maintenance: true
      },
      alertThresholds: {
        usage: 80,
        errors: 10,
        latency: 1000
      }
    },
    security: {
      apiKeyExpiry: 365,
      ipWhitelist: false,
      requireHttps: true,
      logRetention: 30,
      auditLog: true
    },
    advanced: {
      debugMode: false,
      verboseLogging: false,
      cacheEnabled: true,
      cacheTTL: 3600,
      compressionEnabled: true,
      customHeaders: {}
    }
  });

  const [activeSection, setActiveSection] = useState<keyof Settings>('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newIP, setNewIP] = useState('');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    // LocalStorageから設定を読み込み
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // LocalStorageに保存（実際の実装ではAPIを使用）
      localStorage.setItem('appSettings', JSON.stringify(settings));
      
      // APIコール（実装例）
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        throw new Error('設定の保存に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReset = () => {
    setSettings({
      general: {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        dateFormat: 'YYYY-MM-DD',
        currency: 'JPY',
        darkMode: false
      },
      api: {
        defaultVersion: 'v1',
        responseFormat: 'json',
        rateLimit: 1000,
        timeout: 30000,
        retryAttempts: 3,
        webhookUrl: '',
        allowedIPs: []
      },
      notifications: {
        email: {
          apiErrors: true,
          usageAlerts: true,
          weeklyReport: false,
          monthlyReport: true,
          maintenance: true
        },
        alertThresholds: {
          usage: 80,
          errors: 10,
          latency: 1000
        }
      },
      security: {
        apiKeyExpiry: 365,
        ipWhitelist: false,
        requireHttps: true,
        logRetention: 30,
        auditLog: true
      },
      advanced: {
        debugMode: false,
        verboseLogging: false,
        cacheEnabled: true,
        cacheTTL: 3600,
        compressionEnabled: true,
        customHeaders: {}
      }
    });
    setShowResetModal(false);
    setMessage({ type: 'success', text: '設定をリセットしました' });
  };

  const addIP = () => {
    if (newIP && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(newIP)) {
      setSettings({
        ...settings,
        api: {
          ...settings.api,
          allowedIPs: [...settings.api.allowedIPs, newIP]
        }
      });
      setNewIP('');
    }
  };

  const removeIP = (ip: string) => {
    setSettings({
      ...settings,
      api: {
        ...settings.api,
        allowedIPs: settings.api.allowedIPs.filter(i => i !== ip)
      }
    });
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setSettings({
        ...settings,
        advanced: {
          ...settings.advanced,
          customHeaders: {
            ...settings.advanced.customHeaders,
            [newHeaderKey]: newHeaderValue
          }
        }
      });
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: _, ...rest } = settings.advanced.customHeaders;
    setSettings({
      ...settings,
      advanced: {
        ...settings.advanced,
        customHeaders: rest
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← ダッシュボードに戻る
              </button>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-bold">設定</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                リセット
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg transition-all ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* サイドバー */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm p-2">
              {[
                { id: 'general', label: '一般設定', icon: '⚙️' },
                { id: 'api', label: 'API設定', icon: '🔌' },
                { id: 'notifications', label: '通知', icon: '🔔' },
                { id: 'security', label: 'セキュリティ', icon: '🔒' },
                { id: 'advanced', label: '詳細設定', icon: '🛠️' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as keyof Settings)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors flex items-center gap-3 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>

            {/* クイックリンク */}
            <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-medium text-gray-900 mb-3">クイックリンク</h3>
              <div className="space-y-2">
                <Link href="/dashboard/apikeys" className="block text-sm text-blue-600 hover:underline">
                  → APIキー管理
                </Link>
                <Link href="/docs" className="block text-sm text-blue-600 hover:underline">
                  → APIドキュメント
                </Link>
                <Link href="/profile" className="block text-sm text-blue-600 hover:underline">
                  → プロフィール
                </Link>
                <Link href="/support" className="block text-sm text-blue-600 hover:underline">
                  → サポート
                </Link>
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
            {/* 一般設定 */}
            {activeSection === 'general' && (
              <div>
                <h2 className="text-xl font-bold mb-6">一般設定</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
                      <select
                        value={settings.general.language}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, language: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ja">日本語</option>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="ko">한국어</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">タイムゾーン</label>
                      <select
                        value={settings.general.timezone}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, timezone: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asia/Tokyo">東京 (GMT+9)</option>
                        <option value="America/New_York">ニューヨーク (GMT-5)</option>
                        <option value="Europe/London">ロンドン (GMT+0)</option>
                        <option value="Asia/Singapore">シンガポール (GMT+8)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">日付形式</label>
                      <select
                        value={settings.general.dateFormat}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, dateFormat: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="YYYY-MM-DD">2024-01-15</option>
                        <option value="DD/MM/YYYY">15/01/2024</option>
                        <option value="MM/DD/YYYY">01/15/2024</option>
                        <option value="YYYY年MM月DD日">2024年01月15日</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">通貨</label>
                      <select
                        value={settings.general.currency}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, currency: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="JPY">日本円 (¥)</option>
                        <option value="USD">米ドル ($)</option>
                        <option value="EUR">ユーロ (€)</option>
                        <option value="GBP">英ポンド (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">ダークモード</h3>
                        <p className="text-sm text-gray-600 mt-1">インターフェースを暗いテーマに切り替えます</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.general.darkMode}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, darkMode: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API設定 */}
            {activeSection === 'api' && (
              <div>
                <h2 className="text-xl font-bold mb-6">API設定</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">デフォルトAPIバージョン</label>
                      <select
                        value={settings.api.defaultVersion}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, defaultVersion: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="v1">v1 (安定版)</option>
                        <option value="v2-beta">v2-beta (ベータ版)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">レスポンス形式</label>
                      <select
                        value={settings.api.responseFormat}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, responseFormat: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        レート制限 (リクエスト/月)
                      </label>
                      <input
                        type="number"
                        value={settings.api.rateLimit}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, rateLimit: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        タイムアウト (ミリ秒)
                      </label>
                      <input
                        type="number"
                        value={settings.api.timeout}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, timeout: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">リトライ回数</label>
                      <input
                        type="number"
                        value={settings.api.retryAttempts}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, retryAttempts: parseInt(e.target.value) }
                        })}
                        min="0"
                        max="5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                      <input
                        type="url"
                        value={settings.api.webhookUrl}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, webhookUrl: e.target.value }
                        })}
                        placeholder="https://example.com/webhook"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">許可IPアドレス</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        placeholder="192.168.1.1"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addIP}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        追加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {settings.api.allowedIPs.map(ip => (
                        <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-mono">{ip}</span>
                          <button
                            onClick={() => removeIP(ip)}
                            className="text-red-600 hover:text-red-700"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                      {settings.api.allowedIPs.length === 0 && (
                        <p className="text-sm text-gray-500">IPアドレス制限なし（すべて許可）</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 通知設定 */}
            {activeSection === 'notifications' && (
              <div>
                <h2 className="text-xl font-bold mb-6">通知設定</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">メール通知</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'apiErrors', label: 'APIエラー', description: 'API呼び出しでエラーが発生した場合に通知' },
                        { key: 'usageAlerts', label: '使用量アラート', description: '使用量が閾値を超えた場合に通知' },
                        { key: 'weeklyReport', label: '週次レポート', description: '毎週月曜日に使用状況をレポート' },
                        { key: 'monthlyReport', label: '月次レポート', description: '毎月1日に詳細な分析レポート' },
                        { key: 'maintenance', label: 'メンテナンス通知', description: 'システムメンテナンス情報' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifications.email[item.key as keyof typeof settings.notifications.email]}
                              onChange={(e) => setSettings({
                                ...settings,
                                notifications: {
                                  ...settings.notifications,
                                  email: {
                                    ...settings.notifications.email,
                                    [item.key]: e.target.checked
                                  }
                                }
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">アラート閾値</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          使用量 (%)
                        </label>
                        <input
                          type="number"
                          value={settings.notifications.alertThresholds.usage}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              alertThresholds: {
                                ...settings.notifications.alertThresholds,
                                usage: parseInt(e.target.value)
                              }
                            }
                          })}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          エラー数
                        </label>
                        <input
                          type="number"
                          value={settings.notifications.alertThresholds.errors}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              alertThresholds: {
                                ...settings.notifications.alertThresholds,
                                errors: parseInt(e.target.value)
                              }
                            }
                          })}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          レイテンシ (ms)
                        </label>
                        <input
                          type="number"
                          value={settings.notifications.alertThresholds.latency}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              alertThresholds: {
                                ...settings.notifications.alertThresholds,
                                latency: parseInt(e.target.value)
                              }
                            }
                          })}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* セキュリティ設定 */}
            {activeSection === 'security' && (
              <div>
                <h2 className="text-xl font-bold mb-6">セキュリティ設定</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        APIキー有効期限 (日)
                      </label>
                      <input
                        type="number"
                        value={settings.security.apiKeyExpiry}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, apiKeyExpiry: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="365"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ログ保持期間 (日)
                      </label>
                      <input
                        type="number"
                        value={settings.security.logRetention}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, logRetention: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="365"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">IPホワイトリスト</p>
                        <p className="text-sm text-gray-600">指定したIPアドレスからのみアクセス許可</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.ipWhitelist}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, ipWhitelist: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">HTTPS必須</p>
                        <p className="text-sm text-gray-600">すべてのAPI通信でHTTPSを強制</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.requireHttps}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, requireHttps: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">監査ログ</p>
                        <p className="text-sm text-gray-600">すべてのAPI呼び出しを記録</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.auditLog}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, auditLog: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="font-medium text-yellow-800">セキュリティ推奨事項</p>
                          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                            <li>• 定期的にAPIキーを更新してください</li>
                            <li>• 不要なIPアドレスは許可リストから削除してください</li>
                            <li>• 監査ログを定期的に確認してください</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 詳細設定 */}
            {activeSection === 'advanced' && (
              <div>
                <h2 className="text-xl font-bold mb-6">詳細設定</h2>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">デバッグモード</p>
                        <p className="text-sm text-gray-600">詳細なエラー情報を表示</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.debugMode}
                          onChange={(e) => setSettings({
                            ...settings,
                            advanced: { ...settings.advanced, debugMode: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">詳細ログ</p>
                        <p className="text-sm text-gray-600">すべてのAPI操作を詳細に記録</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.verboseLogging}
                          onChange={(e) => setSettings({
                            ...settings,
                            advanced: { ...settings.advanced, verboseLogging: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">キャッシュ</p>
                        <p className="text-sm text-gray-600">APIレスポンスをキャッシュして高速化</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.cacheEnabled}
                          onChange={(e) => setSettings({
                            ...settings,
                            advanced: { ...settings.advanced, cacheEnabled: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">圧縮</p>
                        <p className="text-sm text-gray-600">レスポンスをgzip圧縮して転送量を削減</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.compressionEnabled}
                          onChange={(e) => setSettings({
                            ...settings,
                            advanced: { ...settings.advanced, compressionEnabled: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {settings.advanced.cacheEnabled && (
                    <div className="border-t pt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        キャッシュ有効期限 (秒)
                      </label>
                      <input
                        type="number"
                        value={settings.advanced.cacheTTL}
                        onChange={(e) => setSettings({
                          ...settings,
                          advanced: { ...settings.advanced, cacheTTL: parseInt(e.target.value) }
                        })}
                        min="0"
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">カスタムヘッダー</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newHeaderKey}
                        onChange={(e) => setNewHeaderKey(e.target.value)}
                        placeholder="Header-Name"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={newHeaderValue}
                        onChange={(e) => setNewHeaderValue(e.target.value)}
                        placeholder="Header-Value"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addHeader}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        追加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(settings.advanced.customHeaders).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-mono text-sm">{key}: {value}</span>
                          <button
                            onClick={() => removeHeader(key)}
                            className="text-red-600 hover:text-red-700"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                      {Object.keys(settings.advanced.customHeaders).length === 0 && (
                        <p className="text-sm text-gray-500">カスタムヘッダーなし</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* リセット確認モーダル */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">設定をリセットしますか？</h3>
            <p className="text-gray-600 mb-6">
              すべての設定がデフォルト値に戻ります。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}