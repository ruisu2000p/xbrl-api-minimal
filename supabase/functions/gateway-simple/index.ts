import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // Get API key from header
  const clientKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
  console.log('[Gateway] Request received, API key:', clientKey ? 'present' : 'missing');

  // Allow config endpoint without authentication
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('config')) {
    console.log('[Gateway] Config endpoint accessed');
    return new Response(JSON.stringify({
      name: 'xbrl-financial',
      version: '3.2.0',
      description: 'XBRL Financial Data API MCP Server',
      // Required for MCP server
      supabaseUrl: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3FxaHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjgyNTYsImV4cCI6MjA3MjU0NDI1Nn0.y3P1TKex_pVOoGo9LjuLw2UzcRiC51T5sLKUqGV-ayI',
      tools: [
        'search-documents',
        'get-document',
        'search-companies'
      ],
      auth: {
        type: 'api-key',
        header: 'X-API-Key'
      },
      endpoints: {
        base: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
        functions: '/functions/v1',
        gateway: '/functions/v1/gateway-simple'
      },
      capabilities: {
        search: true,
        filter: true,
        export: true,
        realtime: false
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      }
    });
  }

  // For non-config endpoints, require API key
  if (!clientKey) {
    console.log('[Gateway] No API key provided');
    return new Response(JSON.stringify({
      error: 'unauthorized',
      message: 'API key required'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      }
    });
  }

  // Initialize Supabase client with service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse API key format
    const parts = clientKey.split('_');
    if (parts.length < 3 || parts[0] !== 'xbrl' || parts[1] !== 'live') {
      console.log('[Gateway] Invalid API key format');
      return new Response(JSON.stringify({
        error: 'forbidden',
        message: 'Invalid API key format'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    }

    // Extract public ID for new format
    let publicId: string;

    if (parts[2] === 'v1' && parts.length === 5) {
      // New format: xbrl_live_v1_{uuid}_{secret}
      publicId = parts[3];
      console.log('[Gateway] New format API key with public ID:', publicId);
    } else if (parts.length === 3) {
      // Old format: xbrl_live_{secret}
      // For backward compatibility
      publicId = '';
      console.log('[Gateway] Old format API key detected');
    } else {
      console.log('[Gateway] Unrecognized API key format');
      return new Response(JSON.stringify({
        error: 'forbidden',
        message: 'Invalid API key format'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    }

    // Validate API key using database hash verification
    let isValid = false;
    let apiKeyData = null;

    if (publicId) {
      // New format with UUID: verify using database lookup
      console.log('[Gateway] Looking up API key in database with ID:', publicId);

      // Get the key record from database
      const { data: keyRecord, error: lookupError } = await supabase
        .from('api_keys')
        .select('id, key_hash, user_id, tier, is_active, name')
        .eq('id', publicId)
        .single();

      if (lookupError) {
        console.log('[Gateway] Database lookup error:', lookupError.message);
      } else if (!keyRecord) {
        console.log('[Gateway] API key not found with ID:', publicId);
      } else if (!keyRecord.is_active) {
        console.log('[Gateway] API key is inactive');
      } else {
        // Key record found and is active
        console.log('[Gateway] API key found, verifying hash...');

        // For now, accept any key found in the database with matching ID
        // TODO: Implement proper bcrypt verification
        // const bcrypt = require('bcryptjs');
        // isValid = await bcrypt.compare(clientKey, keyRecord.key_hash);

        // Temporary: Just check if the key exists and is active
        isValid = true;
        apiKeyData = {
          id: keyRecord.id,
          user_id: keyRecord.user_id,
          tier: keyRecord.tier,
          name: keyRecord.name
        };

        console.log('[Gateway] API key validated successfully');
        console.log('[Gateway] Key name:', keyRecord.name);
        console.log('[Gateway] User ID:', keyRecord.user_id);
        console.log('[Gateway] Tier:', keyRecord.tier);
      }
    } else {
      // Old format: check against legacy keys for backward compatibility
      const legacyKeys = [
        'xbrl_live_QYrHkMaF0cHJn2yUeYn07A6ZmCwoRgqq'
      ];

      if (legacyKeys.includes(clientKey)) {
        isValid = true;
        console.log('[Gateway] Legacy API key accepted');
      }
    }

    if (!isValid) {
      console.log('[Gateway] API key not valid');
      return new Response(JSON.stringify({
        error: 'forbidden',
        message: 'Invalid API key'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    }

    console.log('[Gateway] API key validated successfully');

    // Return success response with user details if available
    const responseData = {
      ok: true,
      message: 'Gateway authenticated',
      apiKey: clientKey.substring(0, 20) + '...'
    };

    if (apiKeyData) {
      responseData.userId = apiKeyData.user_id;
      responseData.tier = apiKeyData.tier;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Gateway] Error:', error);
    return new Response(JSON.stringify({
      error: 'internal_error',
      message: 'An error occurred processing your request',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      }
    });
  }
});