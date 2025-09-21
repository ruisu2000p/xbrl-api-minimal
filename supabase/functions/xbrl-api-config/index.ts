import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  try {
    // Basic authentication check
    const authHeader = req.headers.get('authorization')
    const apiKey = req.headers.get('x-api-key')

    if (!authHeader && !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Verify API key if provided (simple validation for config endpoint)
    if (apiKey && !apiKey.startsWith('xbrl_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // Remove 'functions/v1' prefix if present
    if (pathSegments[0] === 'functions' && pathSegments[1] === 'v1') {
      pathSegments.splice(0, 2)
    }

    // Handle /xbrl-api-config endpoint
    if (pathSegments[0] === 'xbrl-api-config' || pathSegments.length === 0) {
      // Return configuration for MCP server
      const config = {
        version: "3.2.0",
        status: "active",
        endpoints: {
          api: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy",
          config: "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-config"
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
          region: "us-east-1",
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
    }

    // Return 404 for unknown paths
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})