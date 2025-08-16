#!/usr/bin/env node

/**
 * 新しく発行されたAPIキーをチェック・登録
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkAndSaveApiKey() {
  // 新しく発行されたAPIキー
  const newApiKey = 'xbrl_live_RI6So0THMeMwc5JH5dWw8ZY9zwPTaUKV';
  
  console.log('🔍 Checking new API key...\n');
  console.log('API Key:', newApiKey);
  
  // ハッシュ値を計算
  const keyHashBase64 = crypto.createHash('sha256').update(newApiKey).digest('base64');
  const keyHashHex = crypto.createHash('sha256').update(newApiKey).digest('hex');
  const keyPrefix = newApiKey.substring(0, 16);
  const keySuffix = newApiKey.slice(-4);
  
  console.log('Prefix:', keyPrefix);
  console.log('Suffix:', keySuffix);
  console.log('SHA256 (Base64):', keyHashBase64);
  console.log('SHA256 (Hex):', keyHashHex);
  console.log('');

  // 1. このキーが既に存在するかチェック
  console.log('📊 Checking if key exists in database...');
  const { data: existing, error: checkError } = await supabase
    .from('api_keys')
    .select('*')
    .or(`key_prefix.eq.${keyPrefix},key_hash.eq.${keyHashBase64}`)
    .single();

  if (existing) {
    console.log('✅ Key already exists in database!');
    console.log('ID:', existing.id);
    console.log('Name:', existing.name);
    console.log('Status:', existing.status);
    console.log('Is Active:', existing.is_active);
    return;
  }

  console.log('❌ Key not found in database.');
  console.log('\n💾 Saving the key to database...');

  // 2. ユーザーを取得または作成
  const { data: users } = await supabase.auth.admin.listUsers();
  let userId;
  
  if (users?.users && users.users.length > 0) {
    userId = users.users[0].id;
    console.log('Using existing user:', users.users[0].email);
  } else {
    // デフォルトユーザーID
    userId = 'a0000000-0000-0000-0000-000000000001';
    console.log('Using default user ID');
  }

  // 3. APIキーを保存（現在のテーブル構造に合わせて）
  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: 'Production API Key (Manual Recovery)',
      key_prefix: keyPrefix,
      key_suffix: keySuffix,
      key_hash: keyHashBase64,
      is_active: true,
      status: 'active',
      environment: 'production',
      permissions: {
        endpoints: ['*'],
        scopes: ['read:markdown'],
        rate_limit: 10000
      },
      metadata: {
        created_via: 'manual_recovery',
        original_issue: 'Vercel production'
      },
      created_by: userId,
      tier: 'pro',
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to save API key:', insertError);
    console.log('\n🔧 Try running this SQL in Supabase:');
    console.log(`
INSERT INTO api_keys (
  id,
  user_id,
  name,
  key_prefix,
  key_suffix,
  key_hash,
  is_active,
  status,
  environment,
  permissions,
  created_at,
  expires_at,
  tier
) VALUES (
  gen_random_uuid(),
  '${userId}'::uuid,
  'Production API Key',
  '${keyPrefix}',
  '${keySuffix}',
  '${keyHashBase64}',
  true,
  'active',
  'production',
  '{"endpoints": ["*"], "scopes": ["read:markdown"]}'::jsonb,
  now(),
  now() + interval '1 year',
  'pro'
);
    `);
    return;
  }

  console.log('✅ API key saved successfully!');
  console.log('ID:', newKey.id);
  
  // 4. 確認
  console.log('\n🔍 Verifying the saved key...');
  const { data: verify } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHashBase64)
    .single();

  if (verify) {
    console.log('✅ Verification successful!');
    console.log('\n📝 You can now use this API key:');
    console.log(`Authorization: Bearer ${newApiKey}`);
  }
}

// 実行
checkAndSaveApiKey().catch(console.error);