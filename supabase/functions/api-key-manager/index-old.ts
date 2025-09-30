import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

console.log('🚀 API Key Manager Function Starting (Simplified Version)');

// 軽量JWT解析（署名検証なし）
function getUserIdFromJWT(bearer: string | null): string | null {
  if (!bearer) return null;
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    // base64url to base64 conversion
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    const json = atob(base64);
    const obj = JSON.parse(json);

    // Check expiration
    if (obj?.exp && Date.now() / 1000 > obj.exp) return null;

    return obj?.sub ?? null;
  } catch {
    return null;
  }
}

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
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Use a default pepper if not configured (for development)
    const PEPPER = Deno.env.get('API_KEY_PEPPER') || 'default-pepper-for-development';
    const BCRYPT_COST = Number(Deno.env.get('BCRYPT_COST') || '10');

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return json(500, {
        error: 'Missing environment variables',
        missing: {
          SUPABASE_URL: !SUPABASE_URL,
          SERVICE_KEY: !SERVICE_KEY
        }
      });
    }

    console.log('✅ Environment variables OK');
    console.log('🔐 Security config: bcrypt cost:', BCRYPT_COST);

    // Initialize Supabase client
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        persistSession: false
      }
    });

    // Extract user ID from JWT
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const userId = getUserIdFromJWT(authHeader);

    if (!userId) {
      console.error('❌ Invalid or missing JWT token');
      return json(401, { error: 'Invalid or expired token' });
    }

    console.log('✅ Authenticated user:', userId);

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

    // Handle list action
    if (action === 'list') {
      console.log('📋 Fetching API keys...');

      // Use private schema tables
      const { data, error } = await admin
        .from('api_keys')
        .select('id, name, key_prefix, tier, is_active, created_at, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error (list):', error);
        return json(500, {
          error: 'Database error',
          details: error.message
        });
      }

      console.log('✅ Found API keys:', data?.length || 0);

      return json(200, {
        success: true,
        keys: data || []
      });
    }

    // Handle rotate action (create/reissue/regenerate)
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

      // Hash the API key
      console.log('🔐 Hashing API key...');
      const keyHash = await bcrypt.hash(apiKey + PEPPER, BCRYPT_COST);
      const keyPrefix = apiKey.substring(0, 12);

      console.log('🔑 Generated key with prefix:', keyPrefix);

      // Deactivate old keys - try both tables
      const { error: deactivateError1 } = await admin
        .from('api_keys_main')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (deactivateError1?.message?.includes('relation')) {
        const { error: deactivateError2 } = await admin
          .from('api_keys')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('is_active', true);
        if (deactivateError2) {
          console.error('⚠️ Failed to deactivate old keys:', deactivateError2);
        }
      } else if (deactivateError1) {
        console.error('⚠️ Failed to deactivate old keys:', deactivateError1);
      }

      if (deactivateError) {
        console.error('⚠️ Failed to deactivate old keys:', deactivateError);
      }

      // Insert new key
      const { data, error } = await admin
        .from('api_keys')
        .insert({
          user_id: userId,
          name: key_name.trim(),
          key_hash: keyHash,
          key_prefix: keyPrefix,
          tier: tier,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error (create):', error);
        return json(500, {
          error: 'Database error',
          details: error.message
        });
      }

      console.log('✅ API key created successfully');

      return json(200, {
        success: true,
        apiKey: apiKey,
        keyId: data?.id,
        name: data?.name,
        tier: data?.tier,
        message: 'このAPIキーは一度だけ表示されます。安全な場所に保管してください。'
      });
    }

    // Handle delete action
    if (action === 'delete') {
      const { key_id } = actualBody;

      console.log('🗑️ Delete action - key_id:', key_id);

      if (!key_id) {
        console.error('❌ Invalid key_id:', key_id);
        return json(400, {
          error: 'key_id is required'
        });
      }

      // Delete key (deactivate)
      const { error } = await admin
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', key_id)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Database error (delete):', error);
        return json(500, {
          error: 'Database error',
          details: error.message
        });
      }

      console.log('✅ API key deleted successfully');

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

    return json(500, {
      error: 'InternalError',
      message: 'An unexpected error occurred'
    });
  }
});