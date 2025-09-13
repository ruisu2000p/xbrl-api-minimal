import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as crypto from "https://deno.land/std@0.177.0/crypto/mod.ts";

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
  const randomStr = [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${randomStr}`;
}

// Hash API key with HMAC-SHA256
export async function hashKey(plain: string): Promise<string> {
  const KEY_PEPPER = Deno.env.get("KEY_PEPPER");
  const PEPPER_IS_BASE64 = true; // KEY_PEPPER is base64 encoded
  
  if (!KEY_PEPPER) {
    throw new Error("KEY_PEPPER environment variable not set");
  }
  
  try {
    const encoder = new TextEncoder();
    
    // Decode pepper from base64 if needed
    const pepperData = PEPPER_IS_BASE64 
      ? Uint8Array.from(atob(KEY_PEPPER), c => c.charCodeAt(0))
      : encoder.encode(KEY_PEPPER);
    
    // Import pepper as HMAC key
    const key = await crypto.subtle.importKey(
      "raw",
      pepperData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Create HMAC
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(plain)
    );
    
    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.error("HMAC generation error:", error);
    throw new Error("Failed to generate HMAC");
  }
}

// Mask API key for display
export function maskKey(key: string): string {
  if (!key || key.length < 12) return key;
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

// Authenticate API key (enhanced version)
export async function authenticateApiKey(headers: Headers) {
  const key = headers.get("x-api-key");
  if (!key) {
    return { ok: false, status: 401, body: { error: "x-api-key required" } } as const;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract prefix from API key
  const prefix = key.split("_")[0] + "_" + key.split("_")[1];
  const h = await hashKey(key);
  
  // Get key from database with rate limits
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, is_active, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, expires_at")
    .eq("key_prefix", prefix)
    .eq("key_hash", h)
    .limit(1);

  const rec = data?.[0];
  if (error || !rec || !rec.is_active) {
    return { ok: false, status: 403, body: { error: "Invalid API key" } } as const;
  }

  // Check expiration
  if (rec.expires_at && new Date(rec.expires_at) < new Date()) {
    return { ok: false, status: 403, body: { error: "API key expired" } } as const;
  }

  // Return success with rate limits
  return { 
    ok: true,
    keyId: rec.id,
    userId: rec.user_id,
    plan: "free", // Can be enhanced with plan detection
    rateLimits: {
      perMin: rec.rate_limit_per_minute,
      perHour: rec.rate_limit_per_hour,
      perDay: rec.rate_limit_per_day,
    }
  } as const;
}

// Check rate limit (enhanced with atomic RPC)
export async function checkRateLimit(keyId: string, limits: { perMin: number; perHour: number; perDay: number }) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Call the atomic increment and get function
  const { data, error } = await supabase.rpc("incr_usage_and_get", { p_key_id: keyId });
  
  if (error) {
    console.error("Usage update error:", error);
    return { ok: false, status: 500, body: { error: "usage update failed" } } as const;
  }

  const row = data?.[0] as { minute_count: number; hour_count: number; day_count: number; } | undefined;
  if (!row) {
    return { ok: false, status: 500, body: { error: "usage not found" } } as const;
  }

  // Check against limits
  if (limits.perMin && row.minute_count > limits.perMin) {
    return { ok: false, status: 429, body: { error: "Too Many Requests (per-minute)" } } as const;
  }
  
  if (limits.perHour && row.hour_count > limits.perHour) {
    return { ok: false, status: 429, body: { error: "Too Many Requests (per-hour)" } } as const;
  }
  
  if (limits.perDay && row.day_count > limits.perDay) {
    return { ok: false, status: 429, body: { error: "Daily quota exceeded" } } as const;
  }

  return { ok: true } as const;
}