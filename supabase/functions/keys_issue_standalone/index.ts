import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
};

// Generate random API key
function generateApiKey(prefix: string = "xbrl_live", size: number = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  const randomStr = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${randomStr}`;
}

// Hash API key with HMAC-SHA256
async function hashKey(plain: string): Promise<string> {
  const KEY_PEPPER = Deno.env.get("KEY_PEPPER");
  
  if (!KEY_PEPPER) {
    throw new Error("KEY_PEPPER environment variable not set");
  }
  
  try {
    const encoder = new TextEncoder();
    
    // Decode pepper from base64
    const pepperData = Uint8Array.from(atob(KEY_PEPPER), c => c.charCodeAt(0));
    
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
function maskKey(key: string): string {
  if (!key || key.length < 12) return key;
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}****${suffix}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse request body
    let name = "API Key";
    let userId = "anonymous";
    
    if (req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        name = body.name || name;
        userId = body.user_id || body.userId || userId;
      } catch (e) {
        // Ignore parse errors, use defaults
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user already has too many keys
    const { data: existingKeys, error: countError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (countError) {
      console.error("Count error:", countError);
    }

    if (existingKeys && existingKeys.length >= 10) {
      return new Response(
        JSON.stringify({ 
          error: "Maximum number of API keys reached",
          message: "You can have up to 10 active API keys. Please deactivate an existing key before creating a new one."
        }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    // Generate new API key
    const plainKey = generateApiKey("xbrl_live");
    const keyHash = await hashKey(plainKey);
    const maskedKey = maskKey(plainKey);
    
    // Extract parts for storage
    const parts = plainKey.split("_");
    const keyPrefix = `${parts[0]}_${parts[1]}`;
    const keySuffix = plainKey.substring(plainKey.length - 4);
    
    // Set expiration to 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert new API key
    const { data: newKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        name: name,
        user_id: userId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        key_suffix: keySuffix,
        masked_key: maskedKey,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        rate_limit_per_minute: 100,
        rate_limit_per_hour: 10000,
        rate_limit_per_day: 100000,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create API key",
          details: insertError.message 
        }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    // Return the plain key (only time it will be visible)
    return new Response(
      JSON.stringify({
        success: true,
        key: plainKey,
        masked_key: maskedKey,
        name: name,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        rate_limits: {
          per_minute: 100,
          per_hour: 10000,
          per_day: 100000,
        },
        message: "Please save this API key securely. It will not be shown again."
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );
  }
});