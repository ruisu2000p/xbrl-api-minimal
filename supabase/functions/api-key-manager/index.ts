import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

console.log('🚀 API Key Manager Function (SECURITY DEFINER Version)');

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// アクション名を正規化する関数
function normalizeAction(a: string | undefined): string {
  const raw = (a ?? '').toLowerCase();
  const map: Record<string, string> = {
    '': 'list',
    'list': 'list',
    'get': 'list',
    'fetch': 'list',
    'create': 'rotate',
    'rotate': 'rotate',
    'reissue': 'rotate',
    'regenerate': 'rotate',
    'refresh': 'rotate',
    'delete': 'delete',
    'remove': 'delete',
    'revoke': 'rotate'
  };
  return map[raw] ?? 'list';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📨 Request method:', req.method);
    console.log('📨 Request URL:', req.url);

    // Environment check
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return json(500, {
        error: 'Missing environment variables',
        missing: {
          SUPABASE_URL: !SUPABASE_URL,
          ANON_KEY: !ANON_KEY
        }
      });
    }

    console.log('✅ Environment variables OK');
    console.log('🔐 Using bcrypt for API key hashing');

    // Initialize Supabase client with ANON_KEY (not Service Role Key)
    // SECURITY DEFINER functions will handle RLS bypass internally
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

    console.log('🔍 Authorization header present:', !!authHeader);
    console.log('🔍 Authorization header starts with Bearer:', authHeader?.startsWith('Bearer '));

    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return json(401, { error: 'Missing authorization header' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid authorization header format:', authHeader.substring(0, 20));
      return json(401, { error: 'Invalid authorization header format' });
    }

    // Extract JWT token from Bearer header
    const token = authHeader.substring(7);
    console.log('🔑 Token extracted, length:', token.length, 'prefix:', token.substring(0, 20));

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user is authenticated via JWT (pass token explicitly)
    console.log('🔐 Attempting to get user from token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('❌ Authentication error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      return json(401, { error: 'Authentication failed', details: authError.message });
    }

    if (!user) {
      console.error('❌ No user found in token');
      return json(401, { error: 'No user found in token' });
    }

    console.log('✅ Authenticated user:', user.id);
    console.log('🔐 User metadata:', { email: user.email, aud: user.aud, role: user.role });

    // Parse request body
    let body: any = {};
    try {
      const rawBody = await req.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch (e) {
      console.log('⚠️ Body parsing failed:', e);
      // Default to empty body for GET requests
      if (req.method === 'GET') {
        body = {};
      } else {
        return json(400, {
          error: 'BadRequest',
          message: 'Invalid JSON in request body'
        });
      }
    }

    // Check if body has a nested 'body' property (from supabase.functions.invoke)
    let actualBody = body;
    if (body && typeof body === 'object' && 'body' in body && !('action' in body)) {
      console.log('📦 Detected nested body structure, extracting inner body');
      actualBody = body.body;
    }

    const action = normalizeAction(actualBody?.action);
    console.log('🎯 Action:', action);

    // Handle list action using SECURITY DEFINER function
    if (action === 'list') {
      console.log('📋 Fetching API keys via SECURITY DEFINER function for user:', user.id);
      console.log('📋 Calling list_api_keys_secure with explicit user_id...');

      // Pass user_id explicitly to avoid auth.uid() context issues
      const { data, error } = await supabase.rpc('list_api_keys_secure', {
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Database error (list):', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return json(500, {
          error: 'Database error',
          details: error.message
        });
      }

      console.log('✅ RPC call successful, data received:', JSON.stringify(data));
      console.log('✅ Found API keys count:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('🔍 First key details:', {
          id: data[0].id,
          name: data[0].name,
          prefix: data[0].key_prefix,
          suffix: data[0].key_suffix,
          tier: data[0].tier
        });
      } else {
        console.log('⚠️ No keys returned from RPC for user:', user.id);
        console.log('⚠️ Verified user_id was passed explicitly to RPC function');
      }

      return json(200, {
        success: true,
        keys: data || []
      });
    }

    // Handle rotate action (create/reissue/regenerate) using SECURITY DEFINER function
    if (action === 'rotate') {
      const { key_name, tier = 'free' } = actualBody;

      console.log('🔨 Rotate action - key_name:', key_name, 'tier:', tier);

      if (!key_name || typeof key_name !== 'string') {
        console.error('❌ Invalid key_name:', key_name);
        return json(400, {
          error: 'key_name is required and must be a string'
        });
      }

      // Generate API key
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      let apiKey = 'xbrl_v1_';
      for(let i = 0; i < 32; i++){
        apiKey += chars[array[i] % chars.length];
      }

      const keyPrefix = apiKey.substring(0, 12);
      const keySuffix = apiKey.substring(apiKey.length - 4);

      console.log('🔑 Generated key with prefix:', keyPrefix);
      console.log('🔑 Generated key suffix:', keySuffix);

      // Hash the API key using bcryptjs (Deno-compatible)
      console.log('🔐 Hashing API key with bcryptjs...');
      const salt = await bcrypt.genSalt(10);
      const hashedKey = await bcrypt.hash(apiKey, salt);
      console.log('✅ API key hashed successfully');

      // Create new key using SECURITY DEFINER function
      console.log('📞 Calling create_api_key_secure RPC...');

      const { data, error } = await supabase.rpc('create_api_key_secure', {
        key_name: key_name.trim(),
        key_hash_input: hashedKey,
        key_prefix_input: keyPrefix,
        key_suffix_input: keySuffix,
        tier_input: tier
      });

      console.log('📞 RPC call completed:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('❌ Database error (create):', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // Check if error is due to existing key
        if (error.message && error.message.includes('ALREADY_EXISTS')) {
          return json(409, {
            error: 'AlreadyExists',
            message: '既にAPIキーが存在します',
            details: '新しいキーを作成する前に、既存のキーを削除してください。'
          });
        }

        return json(500, {
          error: 'Database error',
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }

      console.log('✅ API key created successfully, data:', data);

      // data is an array with one element
      const keyData = Array.isArray(data) ? data[0] : data;

      if (!keyData) {
        console.error('❌ No data returned from create_api_key_secure');
        return json(500, {
          error: 'No data returned',
          message: 'Function executed but returned no data'
        });
      }

      return json(200, {
        success: true,
        apiKey: apiKey,
        keyId: keyData?.id,
        name: keyData?.name,
        tier: keyData?.tier,
        message: 'このAPIキーは一度だけ表示されます。安全な場所に保管してください。'
      });
    }

    // Handle delete action using SECURITY DEFINER function
    if (action === 'delete') {
      const { key_id } = actualBody;

      console.log('🗑️ Delete action - key_id:', key_id);

      if (!key_id) {
        console.error('❌ Invalid key_id:', key_id);
        return json(400, {
          error: 'key_id is required'
        });
      }

      // Delete key using SECURITY DEFINER function
      const { data, error } = await supabase.rpc('revoke_api_key_secure', {
        key_id_input: key_id
      });

      if (error) {
        console.error('❌ Database error (delete):', error);
        return json(500, {
          error: 'Database error',
          details: error.message
        });
      }

      console.log('✅ API key deleted successfully:', data);

      return json(200, {
        success: true,
        message: 'APIキーが正常に削除されました'
      });
    }

    // Unknown action
    return json(400, {
      error: 'Unknown action',
      action
    });

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });

    return json(500, {
      error: 'InternalError',
      message: error?.message || 'An unexpected error occurred',
      details: error?.stack
    });
  }
});
