import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple HMAC-SHA256 implementation for debugging
async function hashKey(plain: string): Promise<string> {
  const KEY_PEPPER = Deno.env.get("KEY_PEPPER");
  
  if (!KEY_PEPPER) {
    return "NO_KEY_PEPPER_SET";
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
    return `HASH_ERROR: ${error.message}`;
  }
}

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No x-api-key header provided" }),
        { status: 400, headers }
      );
    }

    // Extract prefix
    const parts = apiKey.split("_");
    const prefix = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : "INVALID";
    
    // Calculate hash
    const hash = await hashKey(apiKey);
    
    // Get environment info
    const KEY_PEPPER = Deno.env.get("KEY_PEPPER");
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Try to find the key in database
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, user_id, is_active, key_prefix, key_hash")
      .eq("key_prefix", prefix)
      .eq("key_hash", hash)
      .limit(1);
    
    // Also get all keys with this prefix for debugging
    const { data: allWithPrefix } = await supabase
      .from("api_keys")
      .select("id, key_prefix, substring(key_hash, 1, 20) as hash_preview")
      .eq("key_prefix", prefix);
    
    return new Response(
      JSON.stringify({
        debug_info: {
          provided_key: apiKey.substring(0, 20) + "...",
          extracted_prefix: prefix,
          calculated_hash: hash,
          key_pepper_set: !!KEY_PEPPER,
          key_pepper_length: KEY_PEPPER ? KEY_PEPPER.length : 0,
          key_pepper_preview: KEY_PEPPER ? KEY_PEPPER.substring(0, 10) + "..." : "NOT_SET",
        },
        database_lookup: {
          found: !!data && data.length > 0,
          result: data,
          error: error?.message,
          all_with_prefix: allWithPrefix,
        },
        expected_values: {
          test_key: "xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
          expected_hash: "550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8",
          hash_matches: hash === "550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8",
        }
      }, null, 2),
      { status: 200, headers }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { status: 500, headers }
    );
  }
});