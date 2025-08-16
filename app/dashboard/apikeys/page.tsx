'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_suffix?: string;
  is_active?: boolean;
  status?: string;
  scopes?: string[];
  revoked?: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  total_requests?: number;
  successful_requests?: number;
  failed_requests?: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('Claude Desktop');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCopyAlert, setShowCopyAlert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // LocalStorageからユーザー情報を確認
    const localUser = localStorage.getItem('user');
    if (!localUser) {
      router.push('/login');
      return;
    }
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const response = await fetch('/api/v1/apikeys');
      if (!response.ok) {
        if (response.status === 401) {
          // LocalStorageを再確認
          const localUser = localStorage.getItem('user');
          if (!localUser) {
            router.push('/login');
            return;
          }
          // LocalStorageにユーザーがある場合は空の配列を表示
          setKeys([]);
          return;
        }
        throw new Error('Failed to fetch keys');
      }
      const data = await response.json();
      setKeys(data.keys || []);
    } catch (error) {
      console.error('Error fetching keys:', error);
      // エラー時も空の配列を表示
      setKeys([]);
    }
  }

  async function createApiKey() {
    setIsCreating(true);
    try {
      const response = await fetch('/api/v1/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: ['read:markdown'],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create key');
      }

      const data = await response.json();
      setCreatedKey(data.apiKey);
      // 完全なAPIキーをLocalStorageに保存（ダッシュボードで使用）
      if (data.apiKey) {
        localStorage.setItem('currentApiKey', data.apiKey);
      }
      setNewKeyName('');
      fetchKeys();
    } catch (error) {
      console.error('Error creating key:', error);
      alert('APIキーの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('このAPIキーを無効化しますか？')) return;

    try {
      const response = await fetch(`/api/v1/apikeys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke key');
      }

      fetchKeys();
    } catch (error) {
      console.error('Error revoking key:', error);
      alert('APIキーの無効化に失敗しました');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setShowCopyAlert(true);
    setTimeout(() => setShowCopyAlert(false), 3000);
  }

  function generateClaudeConfig(apiKey: string) {
    const config = {
      mcpServers: {
        'xbrl-financial': {
          command: 'node',
          args: ['C:/Users/pumpk/Downloads/xbrl-api-minimal/mcp-server-secure.js'],
          env: {
            XBRL_API_URL: window.location.origin + '/api/v1',
            XBRL_API_KEY: apiKey,
          },
        },
      },
    };
    return JSON.stringify(config, null, 2);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">APIキー管理</h1>

        {/* 新規作成フォーム */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">新しいAPIキーを作成</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="キーの名前（例: Claude Desktop）"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createApiKey}
              disabled={!newKeyName || isCreating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? '作成中...' : 'APIキーを作成'}
            </button>
          </div>
        </div>

        {/* 作成されたキーの表示 */}
        {createdKey && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              ⚠️ APIキーが作成されました（このキーは二度と表示されません）
            </h3>
            <div className="bg-white rounded p-4 mb-4 font-mono text-sm break-all">
              {createdKey}
            </div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => copyToClipboard(createdKey)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                APIキーをコピー
              </button>
              <button
                onClick={() => copyToClipboard(generateClaudeConfig(createdKey))}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Claude Desktop設定をコピー
              </button>
              <button
                onClick={() => setCreatedKey(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                閉じる
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <p>Claude Desktop設定ファイルの場所:</p>
              <code className="bg-gray-100 px-2 py-1 rounded">
                %APPDATA%\Claude\claude_desktop_config.json
              </code>
            </div>
          </div>
        )}

        {/* コピー完了アラート */}
        {showCopyAlert && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            ✓ クリップボードにコピーしました
          </div>
        )}

        {/* 既存のキー一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">既存のAPIキー</h2>
          </div>
          <div className="p-6">
            {keys.length === 0 ? (
              <p className="text-gray-500">APIキーがまだありません</p>
            ) : (
              <div className="space-y-4">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className={`border rounded-lg p-4 ${
                      key.revoked ? 'bg-gray-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{key.name}</h3>
                        <p className="text-sm text-gray-600 font-mono">
                          {key.key_prefix}...{key.key_suffix || ''}
                        </p>
                        <div className="text-sm text-gray-500 mt-2">
                          <p>作成日: {new Date(key.created_at).toLocaleString('ja-JP')}</p>
                          {key.last_used_at && (
                            <p>最終使用: {new Date(key.last_used_at).toLocaleString('ja-JP')}</p>
                          )}
                          {key.expires_at && (
                            <p>有効期限: {new Date(key.expires_at).toLocaleString('ja-JP')}</p>
                          )}
                          {key.scopes && <p>スコープ: {key.scopes.join(', ')}</p>}
                          {key.total_requests !== undefined && (
                            <p>総リクエスト: {key.total_requests} (成功: {key.successful_requests || 0})</p>
                          )}
                        </div>
                      </div>
                      <div>
                        {(key.revoked || key.is_active === false || key.status === 'revoked') ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">
                            無効化済み
                          </span>
                        ) : (
                          <button
                            onClick={() => revokeKey(key.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            無効化
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 使い方 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">APIキーの使い方</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>上記で「APIキーを作成」をクリック</li>
            <li>表示されたAPIキーをコピー（一度だけ表示されます）</li>
            <li>「Claude Desktop設定をコピー」をクリック</li>
            <li>%APPDATA%\Claude\claude_desktop_config.json を開いて貼り付け</li>
            <li>Claude Desktopを再起動</li>
          </ol>
        </div>
      </div>
    </div>
  );
}