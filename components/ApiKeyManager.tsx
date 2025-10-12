'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Copy, Trash2 } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  plan_type: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Use API route to fetch keys (which calls Edge Function)
      const response = await fetch('/api/keys/manage', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      // Map API response to match component interface
      const mappedData = (result.keys || []).map((key: any) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix,
        plan_type: key.tier, // API returns 'tier' field
        is_active: key.is_active,
        last_used_at: key.last_used_at,
        created_at: key.created_at
      }));

      setApiKeys(mappedData);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (name: string, planType: string) => {
    setCreatingKey(true);
    try {
      const response = await fetch('/api/keys/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          key_name: name,
          tier: planType
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // 新しく作成されたキーを表示 (check multiple possible field names for backward compatibility)
      setShowNewKey(data.apiKey || data.api_key || data.newKey);

      // リストを更新
      await fetchApiKeys();

      return data.apiKey || data.api_key || data.newKey;
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('APIキーの作成に失敗しました');
    } finally {
      setCreatingKey(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('このAPIキーを削除してもよろしいですか？')) return;

    try {
      const response = await fetch('/api/keys/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          key_id: keyId
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('APIキーの削除に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('クリップボードにコピーしました');
  };

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">APIキー管理</h2>
          <button
            onClick={() => {
              const name = prompt('APIキーの名前を入力してください');
              if (name) createApiKey(name, 'free');
            }}
            disabled={creatingKey}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Copy size={20} />
            新規作成
          </button>
        </div>

        {/* 新規作成されたキーの表示 */}
        {showNewKey && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium mb-2">
              新しいAPIキーが作成されました。このキーは二度と表示されませんので、必ず保存してください。
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
                {showNewKey}
              </code>
              <button
                onClick={() => copyToClipboard(showNewKey)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <Copy size={20} />
              </button>
              <button
                onClick={() => setShowNewKey(null)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* APIキーリスト */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              APIキーがまだ作成されていません
            </p>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{key.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        key.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {key.is_active ? '有効' : '無効'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {key.plan_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>プレフィックス: <code className="bg-gray-100 px-1 rounded">{key.key_prefix}...</code></p>
                      <p>作成日: {new Date(key.created_at).toLocaleDateString('ja-JP')}</p>
                      {key.last_used_at && (
                        <p>最終使用: {new Date(key.last_used_at).toLocaleDateString('ja-JP')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="削除"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 使用方法 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-bold mb-3">APIの使用方法</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`curl -X GET https://xbrl-api-minimal.vercel.app/api/v1/companies \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
        </pre>
      </div>
    </div>
  );
}
