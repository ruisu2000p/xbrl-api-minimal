'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function TestMCPPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [selectedTool, setSelectedTool] = useState('search-companies')
  const [parameters, setParameters] = useState('{}')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 利用可能なツール
  const tools = [
    {
      name: 'search-companies',
      description: '企業名やティッカーコードで検索',
      defaultParams: JSON.stringify({ query: 'トヨタ', limit: 5 }, null, 2)
    },
    {
      name: 'query-my-data',
      description: 'テーブルからデータを取得',
      defaultParams: JSON.stringify({
        table: 'companies',
        select: 'company_name,ticker_code',
        limit: 5
      }, null, 2)
    },
    {
      name: 'get-storage-md',
      description: 'Markdownドキュメントを取得',
      defaultParams: JSON.stringify({
        storage_path: 'FY2024/example/doc.md',
        max_bytes: 1000
      }, null, 2)
    }
  ]

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  const loadApiKeys = useCallback(async () => {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: keys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (keys && keys.length > 0) {
      setApiKeys(keys)
      setApiKey(keys[0].key)
    }
  }, [router])

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName)
    const tool = tools.find(t => t.name === toolName)
    if (tool) {
      setParameters(tool.defaultParams)
    }
  }

  const testMCP = async () => {
    if (!apiKey) {
      setError('APIキーを選択してください')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const parsedParams = JSON.parse(parameters)

      const response = await fetch('/api/v1/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          tool: selectedTool,
          parameters: parsedParams
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'MCPの呼び出しに失敗しました')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getAvailableTools = async () => {
    if (!apiKey) {
      setError('APIキーを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/mcp', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '利用可能なツールの取得に失敗しました')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            MCP API テスト
          </h1>

          {/* APIキー選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APIキー
            </label>
            {apiKeys.length > 0 ? (
              <select
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.key}>
                    {key.name} ({key.key.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-gray-500">
                APIキーがありません。ダッシュボードから生成してください。
              </div>
            )}
          </div>

          {/* ツール選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MCPツール
            </label>
            <select
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name} - {tool.description}
                </option>
              ))}
            </select>
          </div>

          {/* パラメータ入力 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パラメータ (JSON)
            </label>
            <textarea
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="JSON形式でパラメータを入力"
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={testMCP}
              disabled={loading || !apiKey}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                loading || !apiKey
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '実行中...' : 'MCPツールを実行'}
            </button>

            <button
              onClick={getAvailableTools}
              disabled={loading || !apiKey}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                loading || !apiKey
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              利用可能なツールを確認
            </button>
          </div>

          {/* 結果表示 */}
          {result && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                実行結果
              </h2>
              <div className="bg-gray-50 p-4 rounded-md overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 使用例 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">使用例</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• search-companies: 企業名で検索してデータを取得</p>
              <p>• query-my-data: Supabaseのテーブルから直接データをクエリ</p>
              <p>• get-storage-md: ストレージからMarkdownファイルを取得</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}