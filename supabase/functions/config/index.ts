import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Return configuration for MCP server - no authentication required
  const config = {
    version: "3.2.0",
    status: "active",
    endpoints: {
      api: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy",
      config: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/config"
    },
    features: {
      authentication: true,
      apiKeys: true,
      tiers: ["free", "basic", "premium"]
    },
    tables: [
      "companies",
      "markdown_files_metadata",
      "api_keys",
      "api_key_usage_logs"
    ],
    metadata: {
      projectRef: "wpwqxhyiglbtlaimrjrx",
      region: "ap-northeast-1",
      provider: "supabase"
    }
  }

  return new Response(
    JSON.stringify(config),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    }
  )
})