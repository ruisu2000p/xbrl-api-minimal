// supabase/functions/gateway/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const HMAC_SECRET  = Deno.env.get('KEY_DERIVE_SECRET')!;              // 独自キーのハッシュ用シークレット
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// OpenAPI仕様
const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "XBRL Gateway API",
    version: "1.0.0",
    description: "Financial data API gateway with custom authentication"
  },
  servers: [{
    url: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway"
  }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Custom API key (fin_live_*)"
      }
    },
    responses: {
      Error: {
        description: "Error response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["error", "message"],
              properties: {
                error: {
                  type: "string",
                  enum: ["unauthorized", "forbidden", "not_found", "rate_limited", "server_error"]
                },
                message: { type: "string" },
                retry_after: { type: "integer", nullable: true }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    "/config": {
      get: {
        summary: "Get MCP configuration",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Configuration for MCP client",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["version", "supabaseUrl", "supabaseAnonKey"],
                  properties: {
                    version: { type: "integer", example: 1 },
                    supabaseUrl: { type: "string", format: "uri" },
                    supabaseAnonKey: { type: "string" }
                  }
                }
              }
            },
            headers: {
              "X-RateLimit-Limit": {
                schema: { type: "integer" },
                description: "Maximum requests per minute"
              },
              "X-RateLimit-Remaining": {
                schema: { type: "integer" },
                description: "Remaining requests in current window"
              }
            }
          },
          "401": { "$ref": "#/components/responses/Error" },
          "429": { "$ref": "#/components/responses/Error" }
        }
      }
    },
    "/companies": {
      get: {
        summary: "Get company list",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 100 }
          },
          {
            name: "select",
            in: "query",
            schema: { type: "string", default: "*" }
          }
        ],
        responses: {
          "200": {
            description: "Company list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "object" }
                }
              }
            }
          }
        }
      }
    },
    "/metadata": {
      get: {
        summary: "Get markdown files metadata",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 100 }
          }
        ],
        responses: {
          "200": {
            description: "Metadata list"
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI specification",
        responses: {
          "200": {
            description: "OpenAPI spec",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    }
  }
}

// エラーレスポンス統一ヘルパー
function errorResponse(
  type: 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limited' | 'server_error',
  message?: string,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const statusMap = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    rate_limited: 429,
    server_error: 500
  } as const;

  return new Response(
    JSON.stringify({
      error: type,
      message: message || type.replace('_', ' '),
      ...extra
    }),
    {
      status: statusMap[type],
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
        ...(headers || {})
      }
    }
  );
}

// 内部Supabase呼び出し（service_roleで固定）
const supa = (path: string, init?: RequestInit) =>
  fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      'content-type': 'application/json'
    }
  });

// HMAC-SHA256（16進文字列）
async function hmacSHA256(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// 簡易レート制限（DB集計版）
// 本番は Upstash Redis などのKV推奨。ここでは最小実装。
async function checkRateLimit(apiKeyId: string, perMinute: number) {
  const now = new Date();
  const from = new Date(now.getTime() - 60_000).toISOString();
  const q = `/rest/v1/api_usage?select=count&id=neq.null&api_key_id=eq.${apiKeyId}&used_at=gte.${from}`;
  const r = await supa(q);
  if (!r.ok) return { ok: false, status: 500 };
  const [{ count }] = await r.json();
  if (Number(count) >= perMinute) return { ok: false, status: 429 };
  return { ok: true, status: 200 };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const t0 = performance.now();

  try {
    // URLパスの正規化（MCPサーバーのスペースバグ対応）
    const u = new URL(req.url);
    const rawPath = u.pathname;
    const normalizedPath = rawPath
      .replace(/%20/g, ' ')           // %20をスペースに
      .replace(/\s+/g, ' ')           // 複数スペースを1個に
      .replace(/\s*\/+\s*/g, '/')     // " / " を "/" に
      .replace(/\/+/g, '/')           // 複数スラッシュを1個に
      .replace(/\/+$/, '');           // 末尾スラッシュ除去

    // 0) 入力：ヘッダ
    const clientKey = req.headers.get('x-api-key') ?? '';
    console.log(`[DEBUG] Received API key: ${clientKey ? `${clientKey.substring(0, 8)}...` : 'NONE'}`);
    console.log(`[DEBUG] Original path: ${rawPath}`);
    console.log(`[DEBUG] Normalized path: ${normalizedPath}`);
    console.log(`[DEBUG] Request method: ${req.method}`);

    // OpenAPIエンドポイントは認証不要
    if (normalizedPath.includes('openapi')) {
      return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    }

    if (!clientKey) {
      console.log('[DEBUG] No API key provided');
      return errorResponse('unauthorized', 'API key required');
    }

    // 1) APIキー照合（ハッシュ比較）- シンプル版
    const keyHash = await hmacSHA256(HMAC_SECRET, clientKey);
    console.log(`[DEBUG] Generated key hash: ${keyHash.substring(0, 10)}...`);
    const kRes = await supa(
      `/rest/v1/api_keys?select=*&key_hash=eq.${keyHash}&status=eq.active&limit=1`
    );

    if (!kRes.ok) {
      console.error('API key lookup failed:', await kRes.text());
      return errorResponse('server_error', 'Auth backend error', {
        debug: `Query failed with status ${kRes.status}`
      });
    }

    const keyRows = await kRes.json();
    const keyRow = keyRows[0];
    console.log(`[DEBUG] Found ${keyRows.length} matching keys`);

    if (!keyRow) {
      console.log(`[DEBUG] Invalid API key - no match for hash: ${keyHash.substring(0, 10)}...`);
      return errorResponse('forbidden', 'Invalid API key', {
        debug: `Key hash: ${keyHash.substring(0, 8)}...`
      });
    }

    console.log(`[DEBUG] API key validation successful, keyRow.id: ${keyRow.id}`);

    // 1.1 期限・ステータス（シンプル化）
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return errorResponse('forbidden', 'API key expired');
    }

    // 2) レート制限（一時的に無効化）
    // const rl = await checkRateLimit(keyRow.id, keyRow.rate_limit_per_minute ?? 60);
    console.log('Rate limiting temporarily disabled for debugging');

    // 3) ルーティング（必要に応じて増やす）
    const url = new URL(req.url);
    const pathname = normalizedPath;  // 正規化されたパスを使用

    let resBody: string | undefined;
    let status = 200;
    let endpoint = 'gateway/config';

    // スペースバグも考慮したルーティング（gateway/config, gateway /config の両方に対応）
    // MCPサーバーは "gateway /config" を送信するので、正規化後も対応
    if (pathname === '/gateway/config' || pathname === '/gateway' || pathname.includes('config')) {
      // MCP config エンドポイント - MCP互換形式で返す
      // MCPパッケージは { supabaseUrl, supabaseAnonKey } を期待
      resBody = JSON.stringify({
        version: 1,
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SERVICE_ROLE  // GatewayがService Roleで処理
      });
      status = 200;
      endpoint = 'gateway/config';
    } else if (pathname.endsWith('/companies')) {
      endpoint = 'gateway/companies';
      const limit = url.searchParams.get('limit') ?? '10';
      const select = url.searchParams.get('select') ?? '*';
      // 既存のcompaniesテーブルからデータ取得
      const r = await supa(`/rest/v1/companies?select=${select}&limit=${limit}`);
      resBody = await r.text();
      status = r.status;
    } else if (pathname.endsWith('/metadata')) {
      endpoint = 'gateway/metadata';
      const limit = url.searchParams.get('limit') ?? '10';
      const select = url.searchParams.get('select') ?? '*';
      // メタデータテーブルからデータ取得
      const r = await supa(`/rest/v1/markdown_files_metadata?select=${select}&limit=${limit}`);
      resBody = await r.text();
      status = r.status;
    } else {
      // ヘルスチェック
      resBody = JSON.stringify({
        ok: true,
        message: 'Gateway alive',
        version: '1.0.0',
        endpoints: ['/config', '/companies', '/metadata'],
        timestamp: new Date().toISOString()
      });
      status = 200;
      endpoint = 'gateway/ping';
    }

    // 4) 監査ログ（一時的に無効化）
    console.log(`Request processed: ${endpoint}, pathname: ${pathname}, status: ${status}, latency: ${Math.round(performance.now() - t0)}ms`);

    return new Response(resBody, {
      status,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
        // レート制限ヘッダ（親切設計）
        'x-ratelimit-limit': String(keyRow.rate_limit_per_minute ?? 60),
        'x-ratelimit-remaining': String(Math.max(0, (keyRow.rate_limit_per_minute ?? 60) - 1)),
        'x-api-version': '1.0.0'
      }
    });

  } catch (error) {
    console.error('Gateway error:', error);
    return errorResponse('server_error', error.message);
  }
});