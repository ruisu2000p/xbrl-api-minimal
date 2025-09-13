'use client'

import { useState, useEffect } from 'react'
import { maskApiKey } from '@/lib/supabase/api-key-utils'

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 'free'
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/dashboard/api-keys')
      const data = await response.json()
      if (data.apiKeys) {
        setApiKeys(data.apiKeys)
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const createApiKey = async () => {
    if (!formData.name) {
      alert('APIキー名を入力してください')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      if (data.apiKey) {
        setNewKeyData(data)
        setShowCreateModal(false)
        fetchApiKeys()
      } else {
        alert(data.error || 'APIキーの作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('APIキーの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('このAPIキーを無効化しますか？この操作は取り消せません。')) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/api-keys?id=${keyId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchApiKeys()
      } else {
        alert('APIキーの無効化に失敗しました')
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      alert('APIキーの無効化に失敗しました')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">APIキー管理</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          新規APIキー作成
        </button>
      </div>

      {/* APIキー一覧 */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            APIキーがありません。新規作成してください。
          </p>
        ) : (
          apiKeys.map((key) => (
            <div key={key.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{key.name}</h3>
                  {key.description && (
                    <p className="text-sm text-gray-600 mt-1">{key.description}</p>
                  )}
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">ステータス:</span>{' '}
                      <span className={`font-medium ${
                        key.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {key.status === 'active' ? '有効' : '無効'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">プラン:</span>{' '}
                      <span className="font-medium">{key.tier}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">作成日:</span>{' '}
                      {new Date(key.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    {key.api_key_rate_limits?.[0] && (
                      <p>
                        <span className="text-gray-500">使用状況:</span>{' '}
                        {key.api_key_rate_limits[0].current_day_count} / {key.api_key_rate_limits[0].requests_per_day} (今日)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => revokeApiKey(key.id)}
                  className="ml-4 px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  無効化
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* APIキー作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">新規APIキー作成</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  APIキー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: Production API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明（任意）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="このAPIキーの用途を記載"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プラン
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="free">無料 (10,000回/月)</option>
                  <option value="basic">Basic (50,000回/月)</option>
                  <option value="pro">Pro (200,000回/月)</option>
                  <option value="enterprise">Enterprise (無制限)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={createApiKey}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規APIキー表示モーダル */}
      {newKeyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="text-center mb-4">
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-bold">APIキーが作成されました</h3>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ {newKeyData.message}
              </p>
            </div>

            <div className="bg-gray-100 rounded p-4 mb-4">
              <p className="text-xs text-gray-600 mb-2">APIキー:</p>
              <code className="block text-sm font-mono break-all select-all">
                {newKeyData.apiKey}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(newKeyData.apiKey)
                alert('APIキーをコピーしました')
              }}
              className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              APIキーをコピー
            </button>

            <button
              onClick={() => setNewKeyData(null)}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}