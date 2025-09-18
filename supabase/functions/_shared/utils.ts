import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as crypto from "https://deno.land/std@0.177.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase service role environment variables are not set");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const textEncoder = new TextEncoder();

function decodeSecret(raw: string): Uint8Array {
  try {
    const binary = atob(raw);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return textEncoder.encode(raw);
  }
}

const rawSecret =
  Deno.env.get("KEY_DERIVE_SECRET") ??
  Deno.env.get("KEY_PEPPER") ??
  Deno.env.get("API_KEY_SECRET");

if (!rawSecret) {
  throw new Error("KEY_DERIVE_SECRET (or KEY_PEPPER/API_KEY_SECRET) environment variable must be set");
}

const hmacKeyPromise = crypto.subtle.importKey(
  "raw",
  decodeSecret(rawSecret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"]
);

type ApiKeyRow = {
  id: string;
  user_id: string;
  is_active?: boolean | null;
  status?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_hour?: number | null;
  rate_limit_per_day?: number | null;
  expires_at?: string | null;
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

// Hash API key with HMAC-SHA256
export async function hashKey(plain: string): Promise<string> {
  try {
    const key = await hmacKeyPromise;
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      textEncoder.encode(plain)
    );

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.error("HMAC generation error:", error);
    throw new Error("Failed to generate HMAC");
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

// Authenticate API key (enhanced version)
export async function authenticateApiKey(headers: Headers) {
  const key = headers.get("x-api-key");
  if (!key) {
    return { ok: false, status: 401, body: { error: "x-api-key required" } } as const;
  }

  const hashed = await hashKey(key);

  let { data: keyRecord, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, is_active, status, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, expires_at")
    .eq("key_hash", hashed)
    .limit(1)
    .maybeSingle<ApiKeyRow>();

  if (error && isColumnMissingError(error)) {
    const fallback = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("key_hash", hashed)
      .limit(1)
      .maybeSingle<ApiKeyRow>();

    keyRecord = fallback.data ?? undefined;
    error = fallback.error;
  }

  if (error || !keyRecord) {
    return { ok: false, status: 403, body: { error: "Invalid API key" } } as const;
  }

  if (keyRecord.is_active === false) {
    return { ok: false, status: 403, body: { error: "API key disabled" } } as const;
  }

  if (keyRecord.status && keyRecord.status !== "active") {
    return { ok: false, status: 403, body: { error: "API key inactive" } } as const;
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { ok: false, status: 403, body: { error: "API key expired" } } as const;
  }

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type, status, expires_at")
    .eq("user_id", keyRecord.user_id)
    .eq("status", "active")
    .order("expires_at", { ascending: false, nullsLast: false })
    .limit(1)
    .maybeSingle();

  const subscriptionActive =
    !subscriptionError &&
    subscription &&
    (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

  const plan = subscriptionActive ? subscription.plan_type : "free";

  const rateLimits = {
    perMin: keyRecord.rate_limit_per_minute ?? 60,
    perHour: keyRecord.rate_limit_per_hour ?? 0,
    perDay: keyRecord.rate_limit_per_day ?? 0,
  };

  return {
    ok: true,
    keyId: keyRecord.id,
    userId: keyRecord.user_id,
    plan,
    rateLimits
  } as const;
}

// Check rate limit (enhanced with atomic RPC)
export async function checkRateLimit(keyId: string, limits: { perMin: number; perHour: number; perDay: number }) {
  const noLimits = !limits.perMin && !limits.perHour && !limits.perDay;
  if (noLimits) {
    return { ok: true, counters: { minute: 0, hour: 0, day: 0 }, skipped: true } as const;
  }

  const { data, error } = await supabaseAdmin.rpc("increment_usage_counters", { p_api_key_id: keyId });

  if (error) {
    const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (message.includes("increment_usage_counters") || message.includes("does not exist") || error.code === "42883") {
      console.warn("increment_usage_counters RPC missing. Skipping rate limit enforcement for this request.");
      return { ok: true, counters: { minute: 0, hour: 0, day: 0 }, skipped: true } as const;
    }

    console.error("Usage update error:", error);
    return { ok: false, status: 500, body: { error: "usage update failed" } } as const;
  }

  const row = (Array.isArray(data) ? data[0] : data) ?? {} as { minute_count?: number; hour_count?: number; day_count?: number };
  const minuteCount = row.minute_count ?? 0;
  const hourCount = row.hour_count ?? 0;
  const dayCount = row.day_count ?? 0;

  if (limits.perMin && minuteCount > limits.perMin) {
    return { ok: false, status: 429, body: { error: "Too Many Requests (per-minute)" } } as const;
  }

  if (limits.perHour && hourCount > limits.perHour) {
    return { ok: false, status: 429, body: { error: "Too Many Requests (per-hour)" } } as const;
  }

  if (limits.perDay && dayCount > limits.perDay) {
    return { ok: false, status: 429, body: { error: "Daily quota exceeded" } } as const;
  }

  return { ok: true, counters: { minute: minuteCount, hour: hourCount, day: dayCount } } as const;
}

export async function recordUsage(params: {
  keyId: string;
  userId: string;
  endpoint: string;
  status: number;
  latencyMs: number;
  cost?: number | null;
}) {
  try {
    const now = new Date().toISOString();
    await Promise.all([
      supabaseAdmin
        .from("api_usage")
        .insert({
          api_key_id: params.keyId,
          user_id: params.userId,
          endpoint: params.endpoint,
          status: params.status,
          latency_ms: params.latencyMs,
          cost: params.cost ?? null,
          used_at: now
        }),
      supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: now })
        .eq("id", params.keyId)
    ]);
  } catch (error) {
    console.error("Failed to record API usage", error);
  }
}
