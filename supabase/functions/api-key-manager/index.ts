// Supabase Edge Function: api-key-manager
// APIキー管理専用のEdge Function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
};

// APIキー生成関数（Deno環境用に修正）
function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[array[i] % chars.length];
  }
  return `xbrl_v1_${key}`;
}

// SHA256ハッシュ生成
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(s => s);
    const action = pathSegments[pathSegments.length - 1];

    // Supabaseクライアントの初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { 'X-Client-Info': 'api-key-manager/1.0.0' } },
    });

    // 認証ヘッダーの取得
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // トークンからユーザー情報を取得
    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ルーティング処理
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { key_name, tier = 'free' } = body;

        if (!key_name || typeof key_name !== 'string' || key_name.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: 'APIキー名は必須です' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // APIキーを生成
        const apiKey = generateApiKey();
        const keyHash = await sha256(apiKey);

        // ティアに基づいてレート制限を設定
        const rateLimits: Record<string, number> = {
          free: 60,
          basic: 300,
          premium: 1000
        };

        const rateLimit = rateLimits[tier] || 60;

        // データベースに保存
        const { data: keyData, error: insertError } = await admin
          .from('api_keys')
          .insert({
            user_id: user.id,
            name: key_name.trim(),
            key_hash: keyHash,
            tier: tier,
            rate_limit_per_minute: rateLimit,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used_at: null
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: `APIキーの作成に失敗しました: ${insertError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            apiKey: apiKey,
            keyId: keyData.id,
            name: keyData.name,
            tier: keyData.tier,
            rateLimit: keyData.rate_limit_per_minute,
            message: 'このAPIキーは一度だけ表示されます。安全な場所に保管してください。'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await admin
          .from('api_keys')
          .select('id, name, tier, rate_limit_per_minute, is_active, created_at, last_used_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('List error:', error);
          return new Response(
            JSON.stringify({ error: 'APIキーの取得に失敗しました' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            keys: data || []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (req.method !== 'DELETE') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { key_id } = body;

        if (!key_id) {
          return new Response(
            JSON.stringify({ error: 'キーIDは必須です' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ユーザーが所有するキーのみ削除可能
        const { error } = await admin
          .from('api_keys')
          .delete()
          .eq('id', key_id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Delete error:', error);
          return new Response(
            JSON.stringify({ error: 'APIキーの削除に失敗しました' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'APIキーが正常に削除されました'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in api-key-manager:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});