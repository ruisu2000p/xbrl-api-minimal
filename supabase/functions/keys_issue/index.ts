import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { genKey, hashKey, maskKey, corsHeaders, preflight } from "../_shared/utils.ts";

serve(async (req) => {
  // Handle CORS preflight
  const pf = preflight(req);
  if (pf) return pf;

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { 
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { 
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Check if user already has an active API key
    const { data: existingKeys, error: fetchError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching existing keys:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing keys" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // If user already has 3 or more active keys, reject
    if (existingKeys && existingKeys.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: "Maximum number of API keys reached",
          message: "You can have up to 3 active API keys. Please deactivate an existing key before creating a new one."
        }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Generate new API key
    const keyPrefix = "xbrl_live";
    const plainKey = genKey(keyPrefix);
    const keyHash = await hashKey(plainKey);
    const maskedKey = maskKey(plainKey);
    const keyPrefixStored = plainKey.split("_").slice(0, 2).join("_");

    // Set expiration to 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert new API key
    const { data: newKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_prefix: keyPrefixStored,
        key_hash: keyHash,
        key_suffix: plainKey.substring(plainKey.length - 4),
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
      console.error("Error inserting API key:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create API key" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders() 
          }
        }
      );
    }

    // Return the plain key (only time it will be visible)
    return new Response(
      JSON.stringify({
        success: true,
        api_key: plainKey,
        masked_key: maskedKey,
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
          ...corsHeaders() 
        }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
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