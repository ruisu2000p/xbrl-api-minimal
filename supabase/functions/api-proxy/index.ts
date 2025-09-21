import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // URLを解析
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // /xbrl-api-config エンドポイントの処理
    if (pathSegments.includes('xbrl-api-config')) {
      const config = {
        version: "3.2.0",
        status: "active",
        endpoints: {
          api: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy",
          config: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-config"
        },
        features: {
          authentication: true,
          apiKeys: true,
          tiers: ["free", "basic", "premium"]
        },
        tables: [
          "companies",
          "markdown_files_metadata",
          "api_keys",
          "api_key_usage_logs"
        ],
        metadata: {
          projectRef: "wpwqxhyiglbtlaimrjrx",
          region: "ap-northeast-1",
          provider: "supabase"
        }
      }

      return new Response(
        JSON.stringify(config),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        }
      )
    }

    // 独自APIキーを取得
    const apiKey = req.headers.get('x-api-key') || req.headers.get('apikey')

    // APIキーの検証
    if (!apiKey || !apiKey.startsWith('xbrl_')) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service Roleキーでクライアント作成
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // APIキーを検証（SHA256ハッシュで比較）
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // api_keysテーブルでキーを検証
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id, tier, status')
      .eq('key_hash', hashHex)
      .eq('status', 'active')
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 使用履歴を更新
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', hashHex)

    // リクエストのパスとメソッドを解析
    const path = url.pathname.replace('/api-proxy/', '')

    // Supabase REST APIへプロキシ
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    let targetUrl = `${supabaseUrl}/rest/v1/${path}${url.search}`

    // ティアに基づくアクセス制限
    if (keyData.tier === 'free' && path.includes('markdown_files_metadata')) {
      // Freeティアは直近1年のデータのみ
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      // URLパラメータに年度制限を追加
      const modifiedUrl = new URL(targetUrl)
      modifiedUrl.searchParams.append('fiscal_year', `gte.FY${oneYearAgo.getFullYear()}`)
      targetUrl = modifiedUrl.toString()
    }

    // オリジナルのリクエストをプロキシ
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
        'Content-Type': 'application/json',
        'Prefer': req.headers.get('Prefer') || ''
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
    })

    const responseData = await proxyResponse.text()

    return new Response(responseData, {
      status: proxyResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': proxyResponse.headers.get('Content-Type') || 'application/json'
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})