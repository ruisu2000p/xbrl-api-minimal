import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, content-type",
};

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "x-api-key required" }),
        { 
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract prefix from API key
    const parts = apiKey.split("_");
    if (parts.length < 3) {
      return new Response(
        JSON.stringify({ error: "Invalid API key format" }),
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    const prefix = `${parts[0]}_${parts[1]}`;
    
    // Hash the API key
    let keyHash: string;
    try {
      keyHash = await hashKey(apiKey);
    } catch (error) {
      console.error("Hash error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to validate API key" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    // Look up the API key in database
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, user_id, is_active, rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, expires_at")
      .eq("key_prefix", prefix)
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database lookup failed" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    const keyRecord = data?.[0];
    
    if (!keyRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired API key" }),
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "API key expired" }),
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }

    // Update usage (simplified version without atomic increment)
    const { error: usageError } = await supabase
      .from("api_usage")
      .upsert({
        key_id: keyRecord.id,
        minute_window: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
        hour_window: new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString(),
        day_window: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        minute_count: 1,
        hour_count: 1,
        day_count: 1,
        updated_at: new Date().toISOString(),
      });

    if (usageError) {
      console.error("Usage tracking error:", usageError);
      // Continue anyway - don't fail the request
    }

    // Return success response with sample data
    return new Response(
      JSON.stringify({
        success: true,
        message: "Filings API v1 - Standalone",
        user_id: keyRecord.user_id,
        data: {
          filings: [
            { 
              id: 1, 
              company: "Sample Corp", 
              date: "2024-01-01",
              type: "Annual Report"
            },
            { 
              id: 2, 
              company: "Test Inc", 
              date: "2024-02-01",
              type: "Quarterly Report"
            }
          ],
          total: 2,
          page: 1,
          limit: 10
        }
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