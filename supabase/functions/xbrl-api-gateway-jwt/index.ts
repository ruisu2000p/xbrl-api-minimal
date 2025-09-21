import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { create, verify, decode } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

serve(async (req: Request) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwtSecret = Deno.env.get('JWT_SECRET')

    // JWT_SECRETの存在確認
    if (!jwtSecret) {
      console.error('JWT_SECRET環境変数が設定されていません')
      return new Response(
        JSON.stringify({
          code: 401,
          message: 'Invalid JWT',
          debug: 'JWT_SECRET not configured'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('JWT_SECRET環境変数:', jwtSecret ? '設定済み' : '未設定')

    // APIキーを複数のヘッダーから探す
    let apiKey = req.headers.get('x-api-key') ||
                req.headers.get('apikey') ||
                req.headers.get('X-API-Key') ||
                req.headers.get('X-Api-Key')

    // AuthorizationヘッダーからAPIキーを取得
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer xbrl_v1_')) {
      apiKey = authHeader.replace('Bearer ', '')
    }

    console.log('受信したヘッダー:', {
      'x-api-key': req.headers.get('x-api-key'),
      'Authorization': req.headers.get('Authorization'),
      'apikey': req.headers.get('apikey')
    })

    if (!apiKey || !apiKey.startsWith('xbrl_v1_')) {
      return new Response(
        JSON.stringify({ error: 'APIキーが必要です' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('APIキー検証開始:', apiKey.substring(0, 30) + '...')

    // Service Role Keyでクライアント作成（APIキー検証用）
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // APIキーからJWTを生成
    const jwtResult = await generateJWTFromAPIKey(apiKey, adminSupabase, jwtSecret)
    if (!jwtResult.jwt) {
      return new Response(
        JSON.stringify({
          code: 401,
          message: 'Invalid JWT',
          debug: jwtResult.error || 'JWT generation failed',
          debugDetails: jwtResult.debug || {}
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwtToken = jwtResult.jwt

    console.log('JWT生成成功')

    // JWTを使用してSupabaseクライアントを作成
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`
        }
      }
    })

    // URLパスに応じた処理
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/xbrl-api-gateway-jwt', '')

    console.log('リクエストパス:', path)

    // ルーティング
    if (path === '' || path === '/') {
      return handleGetEndpoints(jwtToken, jwtSecret, corsHeaders)
    } else if (path === '/markdown-files' || path.startsWith('/markdown-files')) {
      return await handleGetMarkdownFiles(userSupabase, url.searchParams, corsHeaders)
    } else if (path === '/download' || path.startsWith('/download')) {
      return await handleDownloadFile(userSupabase, url.searchParams, corsHeaders)
    }

    return new Response(
      JSON.stringify({ error: '不明なエンドポイント' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * APIキーからJWTを生成
 */
async function generateJWTFromAPIKey(
  apiKey: string,
  supabase: any,
  jwtSecret: string
): Promise<{ jwt: string | null, error?: string, debug?: any }> {
  const debugInfo: any = {
    step: '',
    apiKeyLength: apiKey?.length || 0,
    jwtSecretLength: jwtSecret?.length || 0,
    timestamp: new Date().toISOString()
  }

  try {
    debugInfo.step = '1_starting'
    console.log('[JWT] Starting JWT generation for API key:', apiKey.substring(0, 10) + '...')

    debugInfo.step = '2_api_key_verification'
    // RPC関数を使ってAPI キーの検証
    const { data: keyData, error: keyError } = await supabase
      .rpc('verify_api_key_hash', { input_api_key: apiKey })

    debugInfo.rpcCall = {
      keyDataLength: keyData?.length || 0,
      keyError: keyError?.message || null
    }

    if (keyError) {
      debugInfo.step = '2_error_database'
      console.error('[JWT] Database error during API key verification:', keyError)
      return { jwt: null, error: `Database error: ${keyError.message}`, debug: debugInfo }
    }

    if (!keyData || keyData.length === 0) {
      debugInfo.step = '2_error_no_key'
      console.log('[JWT] No matching API key found')
      return { jwt: null, error: 'Invalid API key', debug: debugInfo }
    }

    debugInfo.step = '3_key_verified'
    const apiKeyInfo = keyData[0]
    debugInfo.apiKeyInfo = {
      id: apiKeyInfo.id,
      tier: apiKeyInfo.tier,
      hasId: !!apiKeyInfo.id,
      hasTier: !!apiKeyInfo.tier
    }
    console.log('[JWT] API key verified, tier:', apiKeyInfo.tier)

    debugInfo.step = '4_payload_creation'
    // Supabase互換のJWT ペイロード作成
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: 'supabase',
      ref: 'wpwqxhyiglbtlaimrjrx',
      aud: 'authenticated',
      exp: now + (60 * 60), // 1時間
      iat: now,
      sub: apiKeyInfo.id.toString(),
      role: 'authenticated',
      email: `apikey-${apiKeyInfo.id}@xbrl-api.local`,
      app_metadata: {
        provider: 'xbrl-api',
        tier: apiKeyInfo.tier,
        api_key_id: apiKeyInfo.id
      },
      user_metadata: {
        api_key_name: apiKeyInfo.name,
        tier: apiKeyInfo.tier
      }
    }

    debugInfo.payload = payload
    console.log('[JWT] Creating JWT with payload:', JSON.stringify(payload, null, 2))

    debugInfo.step = '5_crypto_key_generation'
    // JWT シークレットから CryptoKey を生成
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    debugInfo.step = '6_crypto_key_success'
    console.log('[JWT] CryptoKey generated successfully')

    debugInfo.step = '7_jwt_creation'
    // JWT 作成
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      payload,
      key
    )

    debugInfo.step = '8_jwt_success'
    debugInfo.jwtLength = jwt?.length || 0
    console.log('[JWT] JWT created successfully:', jwt.substring(0, 50) + '...')
    return { jwt, error: undefined, debug: debugInfo }

  } catch (error) {
    debugInfo.step = '9_error_caught'
    debugInfo.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
    console.error('[JWT] Error in generateJWTFromAPIKey:', error)
    return { jwt: null, error: `JWT generation failed: ${error.message}`, debug: debugInfo }
  }
}

/**
 * エンドポイント一覧を返す
 */
function handleGetEndpoints(jwtToken: string, jwtSecret: string, corsHeaders: any) {
  try {
    // JWTをデコード
    const [_header, payload, _signature] = jwtToken.split('.')
    const decodedPayload = JSON.parse(atob(payload))

    return new Response(
      JSON.stringify({
        success: true,
        tier: decodedPayload.tier || 'basic',
        role: decodedPayload.role,
        endpoints: [
          {
            path: '/markdown-files',
            method: 'GET',
            description: 'Markdownファイル検索',
            params: ['search', 'limit', 'fiscal_year']
          },
          {
            path: '/download',
            method: 'GET',
            description: 'ファイルダウンロード',
            params: ['path']
          }
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'JWTデコードエラー' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Markdownファイル検索
 */
async function handleGetMarkdownFiles(supabase: any, params: URLSearchParams, corsHeaders: any) {
  try {
    const search = params.get('search') || ''
    const limit = parseInt(params.get('limit') || '10')
    const fiscalYear = params.get('fiscal_year')

    console.log('検索パラメータ:', { search, limit, fiscalYear })

    let query = supabase.from('markdown_files_metadata').select('*')

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,company_id.ilike.%${search}%`)
    }

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear)
    }

    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('検索エラー:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('handleGetMarkdownFiles エラー:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * ファイルダウンロード
 */
async function handleDownloadFile(supabase: any, params: URLSearchParams, corsHeaders: any) {
  try {
    const path = params.get('path')

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'パスが指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('ダウンロードパス:', path)

    // ストレージからファイルをダウンロード
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .download(path)

    if (error) {
      console.error('ダウンロードエラー:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = await data.text()
    return new Response(text, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`
      }
    })
  } catch (error) {
    console.error('handleDownloadFile エラー:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}