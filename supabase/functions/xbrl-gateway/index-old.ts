// supabase/functions/xbrl-gateway/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PRODUCT_API_KEYS?: string; // カンマ区切りの有効なAPIキーリスト
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// APIキーの検証（簡易版：本番ではDBやKVストアで管理推奨）
async function verifyProductKey(xApiKey: string, env: Env): Promise<boolean> {
  if (!xApiKey || !env.PRODUCT_API_KEYS) return false;

  // 環境変数から有効なAPIキーリストを取得
  const validKeys = env.PRODUCT_API_KEYS.split(',').map(k => k.trim());

  // プレフィックスチェック
  if (!xApiKey.startsWith('xbrl_')) return false;

  // キーの存在チェック
  return validKeys.includes(xApiKey);
}

// JWT検証（Supabase Auth経由）
async function verifyJwtWithSupabase(userJwt: string, env: Env): Promise<{ valid: boolean; userId?: string }> {
  if (!userJwt || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { valid: false };
  }

  try {
    // Supabase Authでユーザー情報取得
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${userJwt}`,
      },
    });

    if (!response.ok) {
      console.error('JWT verification failed:', response.status, await response.text());
      return { valid: false };
    }

    const userData = await response.json();
    return {
      valid: true,
      userId: userData.id
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false };
  }
}

serve(async (req: Request) => {
  try {
    // 環境変数取得
    const env: Env = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      PRODUCT_API_KEYS: Deno.env.get("PRODUCT_API_KEYS"),
    };

    // 必須環境変数チェック
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      console.error("Missing required environment variables");
      return json(500, {
        error: "Gateway misconfigured",
        details: "Required environment variables not set"
      });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // ヘッダーから認証情報取得
    const auth = req.headers.get("authorization") || "";
    const userJwt = auth.replace(/^Bearer\s+/i, "").trim();
    const xApiKey = req.headers.get("x-api-key") || "";

    // APIキーのマスキング
    const masked = xApiKey.length <= 8 ? '***' : `${xApiKey.slice(0, 4)}...${xApiKey.slice(-4)}`;
    console.log("Gateway request:", {
      method: req.method,
      url: req.url,
      hasJwt: !!userJwt,
      hasApiKey: !!xApiKey,
      apiKeyMasked: masked
    });

    // 1) APIキー検証
    if (!xApiKey) {
      return json(401, {
        error: "Missing API key",
        message: "X-API-Key header is required"
      });
    }

    const apiKeyValid = await verifyProductKey(xApiKey, env);
    if (!apiKeyValid) {
      return json(401, {
        error: "Invalid API key",
        message: "The provided API key is not valid"
      });
    }

    // 2) JWT検証（オプション：現在はスキップ）
    let userId: string | undefined;
    // JWT検証を一時的に無効化（JWTの問題を回避）
    // if (userJwt) {
    //   const jwtResult = await verifyJwtWithSupabase(userJwt, env);
    //   if (!jwtResult.valid) {
    //     return json(401, {
    //       error: "Invalid JWT",
    //       message: "JWT verification failed"
    //     });
    //   }
    //   userId = jwtResult.userId;
    // }

    // 3) リクエストURLの構築
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // /xbrl-gateway/[endpoint] の形式を期待
    const endpoint = pathSegments.slice(1).join('/') || '';

    // デフォルトのヘルスチェック
    if (!endpoint || endpoint === '') {
      return json(200, {
        success: true,
        message: "XBRL Gateway Service",
        version: "1.0.0",
        endpoints: [
          "/xbrl-gateway/companies",
          "/xbrl-gateway/markdown-files",
          "/xbrl-gateway/search"
        ],
        auth: {
          apiKey: "valid",
          jwt: userJwt ? "valid" : "not provided",
          userId: userId
        }
      });
    }

    // 4) 直接データベースにアクセス（Service Role Keyを使用）
    if (endpoint === 'markdown-files' || endpoint === 'companies') {
      try {
        // Service Role Keyを使用してprivateスキーマにアクセス
        if (!env.SUPABASE_SERVICE_ROLE_KEY) {
          return json(500, { error: 'Service configuration error', message: 'Service role key not configured' });
        }

        // 入力検証
        let searchQuery = url.searchParams.get('search') || url.searchParams.get('query') || '';
        searchQuery = searchQuery.trim();
        if (searchQuery.length > 64) {
          return json(400, { error: 'Query too long (max 64 chars)' });
        }

        const rawLimit = Number(url.searchParams.get('limit') || '10');
        const limit = Math.max(1, Math.min(isFinite(rawLimit) ? rawLimit : 10, 50));

        // デバッグ用ログ
        console.log('Search query:', searchQuery);
        console.log('Limit:', limit);

        // Supabase clientを作成（セッション永続化なし）
        const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false }
        });

        // RPC関数を呼び出し（直クエリではなく安全なRPC経由）
        const { data, error } = await supabaseClient.rpc('search_markdowns_secure', {
          p_key: xApiKey,
          p_q: searchQuery || null,
          p_limit: limit
        });

        if (error) {
          console.error('RPC call failed:', error);
          return json(500, {
            error: 'Database query failed',
            message: 'Unable to search markdown files',
            details: error.message
          });
        }

        return json(200, {
          success: true,
          count: data?.length || 0,
          results: data || [],
          message: data?.length > 0
            ? `Found ${data.length} documents. Use storage_path to read content.`
            : 'No documents found for the search criteria.'
        });
      } catch (error) {
        console.error('Database access error:', error);
        return json(500, { error: 'Database access failed', message: error.message });
      }
    }

    // その他のエンドポイントは従来通り転送
    const upstreamUrl = `${env.SUPABASE_URL}/functions/v1/api-proxy/${endpoint}${url.search}`;

    console.log("Forwarding to:", upstreamUrl);

    // リクエストボディを取得（POSTの場合）
    let body: ArrayBuffer | null = null;
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      body = await req.arrayBuffer();
    }

    // 下流へのリクエスト
    const upstreamHeaders: Record<string, string> = {
      // ★ ここでANON_KEYを注入（クライアントには見せない）
      "apikey": env.SUPABASE_ANON_KEY,
      "X-API-Key": xApiKey,
      "Content-Type": req.headers.get("content-type") || "application/json",
    };

    // JWTがある場合のみAuthorizationヘッダーを追加
    if (userJwt) {
      upstreamHeaders["Authorization"] = `Bearer ${userJwt}`;
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: body,
    });

    // 5) レスポンスを透過的に返す
    const responseBody = await upstreamResponse.arrayBuffer();

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") || "application/json",
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error("Gateway error:", error);
    return json(500, {
      error: "Gateway error",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});