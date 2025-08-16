#!/usr/bin/env node

/**
 * APIキーを手動でSupabaseに保存するスクリプト
 * Vercelで発行したキーが保存されていない場合の修正用
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

async function saveApiKey() {
  console.log('🔧 Saving your API key to Supabase...\n');

  // あなたが発行したAPIキー
  const apiKey = 'xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w';
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');
  const keyPrefix = apiKey.substring(0, 16);

  console.log('API Key Information:');
  console.log('  Plain text:', apiKey);
  console.log('  SHA256 hash:', keyHash);
  console.log('  Prefix:', keyPrefix);
  console.log('');

  // 1. ユーザーを作成または取得
  console.log('Step 1: Creating/finding user...');
  
  // まず既存のユーザーを確認
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let userId;
  
  if (existingUsers?.users && existingUsers.users.length > 0) {
    // 最初のユーザーを使用
    userId = existingUsers.users[0].id;
    console.log(`  Using existing user: ${existingUsers.users[0].email}`);
  } else {
    // 新しいユーザーを作成
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: 'admin@xbrl-api.com',
      password: 'admin2025xbrl',
      email_confirm: true,
    });

    if (userError) {
      console.error('❌ Failed to create user:', userError);
      return;
    }

    userId = newUser.user.id;
    console.log(`  Created new user: admin@xbrl-api.com`);
  }

  // 2. 既存のAPIキーを確認
  console.log('\nStep 2: Checking for existing API key...');
  const { data: existing } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .single();

  if (existing) {
    console.log('  ✅ API key already exists in database!');
    console.log('  ID:', existing.id);
    console.log('  Name:', existing.name);
    return;
  }

  // 3. APIキーを保存
  console.log('\nStep 3: Saving API key to database...');
  const { data: newKey, error: keyError } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: 'Claude Desktop API Key (Manual)',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: ['read:markdown'],
      revoked: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年後
    })
    .select()
    .single();

  if (keyError) {
    console.error('❌ Failed to save API key:', keyError);
    return;
  }

  console.log('  ✅ API key saved successfully!');
  console.log('  ID:', newKey.id);
  console.log('  User ID:', newKey.user_id);
  console.log('');

  // 4. 動作確認
  console.log('Step 4: Verifying API key...');
  const { data: verify } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single();

  if (verify) {
    console.log('  ✅ API key verified in database!');
    console.log('\n🎉 Success! Your API key is now saved in Supabase.');
    console.log('\n📝 You can now use this API key:');
    console.log(`  ${apiKey}`);
    console.log('\n🔧 Claude Desktop configuration:');
    console.log(JSON.stringify({
      mcpServers: {
        'xbrl-financial': {
          command: 'node',
          args: ['C:/Users/pumpk/Downloads/xbrl-api-minimal/mcp-server-secure.js'],
          env: {
            XBRL_API_URL: 'https://xbrl-api-minimal.vercel.app/api/v1',
            XBRL_API_KEY: apiKey,
          },
        },
      },
    }, null, 2));
  } else {
    console.log('  ❌ Could not verify API key in database.');
  }
}

// 実行
saveApiKey().catch(console.error);