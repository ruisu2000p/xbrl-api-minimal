import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers helper
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
  };
}

// Hash API key for validation
async function hashKey(plain: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.warn("Crypto.subtle error, using simple hash:", error);
    // Simple hash fallback
    let hash = 0;
    for (let i = 0; i < plain.length; i++) {
      const char = plain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders() 
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
            ...corsHeaders() 
          }
        }
      );
    }

    // Initialize Supabase client with environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key by hashing and checking against database
    const keyHash = await hashKey(apiKey);
    
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, is_active, expires_at")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      console.error("API key validation failed:", keyError);
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Check if API key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "API key expired" }),
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Parse URL and query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const sector = url.searchParams.get("sector") || "";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Validate limit parameter
    const maxLimit = 1000;
    const actualLimit = Math.min(limit, maxLimit);

    // Query companies
    let query = supabase
      .from("companies")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,ticker.ilike.%${search}%`);
    }

    if (sector) {
      query = query.eq("sector", sector);
    }

    query = query.range(offset, offset + actualLimit - 1);

    const { data: companies, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch companies" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        companies: companies || [],
        total: count || 0,
        limit: actualLimit,
        offset: offset,
        search: search || null,
        sector: sector || null,
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders() 
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
          ...corsHeaders() 
        }
      }
    );
  }
});

// Deploy timestamp: 2025-08-31 - CACHE BUSTER v2
console.log("v1_filings function loaded - version 2025-08-31");