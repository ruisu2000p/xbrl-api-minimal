import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { authByApiKey } from '@/app/api/_lib/authByApiKey'

// MCPツールの定義
const MCP_TOOLS = {
  'query-my-data': {
    description: 'Query XBRL financial data from markdown_files_metadata or companies table',
    parameters: {
      table: { type: 'string', required: true },
      select: { type: 'string', required: false },
      filters: { type: 'object', required: false },
      limit: { type: 'number', required: false }
    }
  },
  'get-storage-md': {
    description: 'Get Markdown document from Supabase Storage',
    parameters: {
      storage_path: { type: 'string', required: true },
      max_bytes: { type: 'number', required: false }
    }
  },
  'search-companies': {
    description: 'Search companies by name or ticker code',
    parameters: {
      query: { type: 'string', required: true },
      limit: { type: 'number', required: false }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // APIキーの検証（x-api-keyヘッダーから取得）
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    // Authorizationヘッダーを設定してauthByApiKeyを呼び出す
    const modifiedRequest = new NextRequest(request.url)
    modifiedRequest.headers.set('authorization', `Bearer ${apiKey}`)

    const authResult = await authByApiKey(modifiedRequest)
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.userId

    const body = await request.json()
    const { tool, parameters } = body

    // ツールの検証
    if (!tool || !MCP_TOOLS[tool as keyof typeof MCP_TOOLS]) {
      return NextResponse.json(
        { error: 'Invalid or missing tool name' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // ツールに応じた処理
    let result
    switch (tool) {
      case 'query-my-data': {
        const { table, select = '*', filters = {}, limit = 10 } = parameters

        let query = supabase.from(table).select(select)

        // フィルタの適用
        for (const [key, value] of Object.entries(filters)) {
          if (typeof value === 'object' && value !== null) {
            const filterObj = value as any
            if (filterObj.$ilike) {
              query = query.ilike(key, filterObj.$ilike)
            } else if (filterObj.$eq) {
              query = query.eq(key, filterObj.$eq)
            } else if (filterObj.$gt) {
              query = query.gt(key, filterObj.$gt)
            } else if (filterObj.$lt) {
              query = query.lt(key, filterObj.$lt)
            }
          } else {
            query = query.eq(key, value)
          }
        }

        query = query.limit(limit)

        const { data, error } = await query
        if (error) throw error

        result = { data, count: data?.length || 0 }
        break
      }

      case 'get-storage-md': {
        const { storage_path, max_bytes = 500000 } = parameters

        // Storageからファイルを取得
        const { data, error } = await supabase
          .storage
          .from('markdown-files')
          .download(storage_path)

        if (error) throw error

        // テキストとして読み込み
        const text = await data.text()
        const truncated = text.length > max_bytes
        const content = truncated ? text.substring(0, max_bytes) : text

        result = {
          content,
          truncated,
          size: text.length,
          path: storage_path
        }
        break
      }

      case 'search-companies': {
        const { query: searchQuery, limit = 10 } = parameters

        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .or(`company_name.ilike.%${searchQuery}%,ticker_code.ilike.%${searchQuery}%`)
          .limit(limit)

        if (error) throw error

        result = {
          companies: data,
          count: data?.length || 0
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'Tool not implemented' },
          { status: 501 }
        )
    }

    // 使用量の記録
    await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        api_key_id: apiKey,
        endpoint: `/api/v1/mcp/${tool}`,
        method: 'POST',
        status_code: 200,
        response_time_ms: Date.now() - new Date(request.headers.get('x-request-start') || Date.now()).getTime()
      })

    return NextResponse.json({
      success: true,
      tool,
      result
    })

  } catch (error) {
    console.error('MCP API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 利用可能なツールのリストを返す
export async function GET(request: NextRequest) {
  // APIキーの検証（x-api-keyヘッダーから取得）
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is required' },
      { status: 401 }
    )
  }

  // Authorizationヘッダーを設定してauthByApiKeyを呼び出す
  const modifiedRequest = new NextRequest(request.url)
  modifiedRequest.headers.set('authorization', `Bearer ${apiKey}`)

  const authResult = await authByApiKey(modifiedRequest)
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  return NextResponse.json({
    tools: Object.entries(MCP_TOOLS).map(([name, config]) => ({
      name,
      ...config
    }))
  })
}