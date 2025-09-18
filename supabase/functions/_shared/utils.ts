import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase service role environment variables are not set");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type ApiKeyRow = {
  id: string;
  user_id: string;
  is_active?: boolean | null;
  status?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_hour?: number | null;
  rate_limit_per_day?: number | null;
  expires_at?: string | null;
  tier?: string | null;
};

const isColumnMissingError = (
  error: { code?: string; message?: string; details?: string } | null,
): boolean => {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
};

// CORS headers helper
export function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
  };
}

// OPTIONS preflight handler
export function preflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  return null;
}

// Generate API key
export function genKey(prefix: string, size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const chars = Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}_${chars}`;
}

// レート制限チェック & ログ記録の統合関数
export async function checkRateLimitAndLog(params: {
  keyId: string;
  userId: string;
  endpoint: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  perMinute?: number;
  perHour?: number;
  perDay?: number;
}) {
  const { keyId, userId, endpoint, method = 'GET', ipAddress, userAgent } = params;
  const limits = {
    perMin: params.perMinute ?? 120,
    perHour: params.perHour ?? 3000,
    perDay: params.perDay ?? 30000
  };

  try {
    // レート制限チェック
    const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin
      .rpc("bump_and_check_rate_limit", {
        p_key_id: keyId,
        p_limit_min: limits.perMin,
        p_limit_hour: limits.perHour,
        p_limit_day: limits.perDay
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      return {
        ok: false,
        status: 500,
        body: { error: "Rate limit system error" },
        headers: {}
      } as const;
    }

    if (!rateLimitResult?.ok) {
      const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 };
      const reset = rateLimitResult?.reset || { minute: 0, hour: 0, day: 0 };

      return {
        ok: false,
        status: 429,
        body: {
          error: "Rate limit exceeded",
          limits: rateLimitResult?.limits,
          current: rateLimitResult?.current,
          remaining,
          reset
        },
        headers: {
          'X-RateLimit-Limit': String(limits.perMin),
          'X-RateLimit-Remaining': String(remaining.minute),
          'X-RateLimit-Reset': String(reset.minute),
          'Retry-After': '60'
        }
      } as const;
    }

    // 成功時のレート制限ヘッダー
    const remaining = rateLimitResult?.remaining || { minute: 0, hour: 0, day: 0 };
    const reset = rateLimitResult?.reset || { minute: 0, hour: 0, day: 0 };

    return {
      ok: true,
      rateLimitInfo: rateLimitResult,
      headers: {
        'X-RateLimit-Limit': String(limits.perMin),
        'X-RateLimit-Remaining': String(remaining.minute),
        'X-RateLimit-Reset': String(reset.minute)
      }
    } as const;

  } catch (error) {
    console.error("Rate limit check failed:", error);
    return {
      ok: false,
      status: 500,
      body: { error: "Internal server error" },
      headers: {}
    } as const;
  }
}

// Mask API key for display
export function maskKey(key: string): string {
  if (!key || key.length < 12) return key;
  const parts = key.split("_");
  const prefix = parts.length > 1 ? parts.slice(0, 2).join("_") : key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

// O(1)化されたAPIキー認証（public_id埋め込み方式）
export async function authenticateApiKey(headers: Headers) {
  const key = headers.get("x-api-key");
  if (!key) {
    return { ok: false, status: 401, body: { error: "x-api-key required" } } as const;
  }

  try {
    console.log("[DEBUG] Starting O(1) API key verification for key:", key ? `${key.substring(0, 15)}...` : 'null');

    // O(1)化されたbcrypt検証関数を使用
    const { data: verifyResult, error: verifyError } = await supabaseAdmin
      .rpc("verify_api_key_complete_v2", { p_api_key: key });

    console.log("[DEBUG] V2 Verify result:", verifyResult);
    console.log("[DEBUG] V2 Verify error:", verifyError);

    if (verifyError) {
      console.error("API key verification error:", verifyError);
      return { ok: false, status: 403, body: { error: "Invalid API key" } } as const;
    }

    if (!verifyResult || !verifyResult.valid) {
      console.log("[DEBUG] API key validation failed:", verifyResult);
      return { ok: false, status: 403, body: { error: "Invalid API key" } } as const;
    }

    // V2関数では tier も含めて返却されるので、そのまま使用
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, status, expires_at")
      .eq("user_id", verifyResult.user_id)
      .eq("status", "active")
      .order("expires_at", { ascending: false, nullsLast: false })
      .limit(1)
      .maybeSingle();

    const subscriptionActive =
      !subscriptionError &&
      subscription &&
      (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

    const plan = subscriptionActive ? subscription.plan_type : (verifyResult.tier || "free");

    // デフォルトレート制限（tier別）
    const defaultLimits = {
      free: { perMin: 60, perHour: 1000, perDay: 10000 },
      basic: { perMin: 120, perHour: 3000, perDay: 30000 },
      premium: { perMin: 300, perHour: 10000, perDay: 100000 }
    };

    const tierLimits = defaultLimits[verifyResult.tier as keyof typeof defaultLimits] || defaultLimits.free;

    return {
      ok: true,
      keyId: verifyResult.key_id,
      userId: verifyResult.user_id,
      plan,
      tier: verifyResult.tier,
      rateLimits: tierLimits
    } as const;

  } catch (error) {
    console.error("O(1) API key verification failed:", error);
    return { ok: false, status: 403, body: { error: "Invalid API key" } } as const;
  }
}

// 包括的なログ記録関数
export async function recordApiUsage(params: {
  keyId: string;
  userId: string;
  endpoint: string;
  method?: string;
  statusCode: number;
  latencyMs?: number;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  countryCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: logId, error } = await supabaseAdmin
      .rpc("log_api_usage", {
        p_key_id: params.keyId,
        p_user_id: params.userId,
        p_endpoint: params.endpoint,
        p_method: params.method || 'GET',
        p_status_code: params.statusCode,
        p_latency_ms: params.latencyMs,
        p_request_size_bytes: params.requestSizeBytes,
        p_response_size_bytes: params.responseSizeBytes,
        p_ip_address: params.ipAddress,
        p_user_agent: params.userAgent,
        p_referer: params.referer,
        p_country_code: params.countryCode,
        p_error_message: params.errorMessage,
        p_metadata: params.metadata ? JSON.stringify(params.metadata) : '{}'
      });

    if (error) {
      console.error("Failed to log API usage:", error);
    } else {
      console.log("[DEBUG] API usage logged with ID:", logId);
    }

    return logId;
  } catch (error) {
    console.error("Failed to record API usage:", error);
    return null;
  }
}
