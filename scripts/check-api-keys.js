#!/usr/bin/env node

/**
 * APIキー確認スクリプト
 * Supabaseに保存されているAPIキーを確認
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkApiKeys() {
  console.log('🔍 Checking API Keys in Supabase...\n');
  console.log('Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('================================================\n');

  // あなたが発行したAPIキー
  const yourApiKey = 'xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w';
  const yourKeyHash = crypto.createHash('sha256').update(yourApiKey).digest('base64');
  const yourKeyPrefix = yourApiKey.substring(0, 16);

  console.log('📌 Your issued API key:');
  console.log('   Plain text:', yourApiKey);
  console.log('   SHA256 (base64):', yourKeyHash);
  console.log('   Prefix:', yourKeyPrefix);
  console.log('');

  // 1. api_keysテーブルの全データを取得
  console.log('📊 Fetching all API keys from database...');
  const { data: allKeys, error: keysError } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (keysError) {
    console.error('❌ Error fetching api_keys:', keysError);
    return;
  }

  if (!allKeys || allKeys.length === 0) {
    console.log('⚠️  No API keys found in the database.');
    console.log('   The table might be empty or not properly set up.');
  } else {
    console.log(`✅ Found ${allKeys.length} API key(s):\n`);
    
    allKeys.forEach((key, index) => {
      console.log(`${index + 1}. API Key Details:`);
      console.log(`   ID: ${key.id}`);
      console.log(`   User ID: ${key.user_id}`);
      console.log(`   Name: ${key.name || 'N/A'}`);
      console.log(`   Prefix: ${key.key_prefix}`);
      console.log(`   Hash: ${key.key_hash?.substring(0, 20)}...`);
      console.log(`   Scopes: ${JSON.stringify(key.scopes)}`);
      console.log(`   Revoked: ${key.revoked}`);
      console.log(`   Created: ${key.created_at}`);
      console.log(`   Last Used: ${key.last_used_at || 'Never'}`);
      console.log('');
    });
  }

  // 2. あなたのAPIキーを検索
  console.log('🔎 Searching for your specific API key...');
  const { data: yourKey, error: searchError } = await supabase
    .from('api_keys')
    .select('*')
    .or(`key_prefix.eq.${yourKeyPrefix},key_hash.eq.${yourKeyHash}`)
    .single();

  if (searchError || !yourKey) {
    console.log('❌ Your API key was NOT found in the database.');
    console.log('   It might not have been saved properly.');
    console.log('\n💡 To fix this, you need to:');
    console.log('   1. Login to the app');
    console.log('   2. Go to /dashboard/apikeys');
    console.log('   3. Create a new API key');
  } else {
    console.log('✅ Your API key was found!');
    console.log('   Database ID:', yourKey.id);
  }

  // 3. ユーザー情報を確認
  console.log('\n👤 Checking users with API keys...');
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.log('⚠️  Could not fetch users (requires admin access)');
  } else if (users?.users) {
    console.log(`Found ${users.users.length} user(s):`);
    
    for (const user of users.users) {
      console.log(`\n   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      
      // このユーザーのAPIキーを確認
      const { data: userKeys } = await supabase
        .from('api_keys')
        .select('key_prefix, name, revoked')
        .eq('user_id', user.id);
      
      if (userKeys && userKeys.length > 0) {
        console.log(`   API Keys: ${userKeys.length}`);
        userKeys.forEach(k => {
          console.log(`     - ${k.key_prefix}... (${k.name}) [${k.revoked ? 'Revoked' : 'Active'}]`);
        });
      } else {
        console.log('   API Keys: None');
      }
    }
  }

  // 4. 直接SQLクエリの提案
  console.log('\n📝 SQL queries to run in Supabase SQL Editor:');
  console.log('================================================');
  console.log(`
-- Check if your API key exists
SELECT * FROM api_keys 
WHERE key_prefix LIKE '${yourKeyPrefix}%'
   OR key_hash = '${yourKeyHash}';

-- View all API keys with user emails
SELECT 
  ak.*,
  au.email
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
ORDER BY ak.created_at DESC;

-- Check if the table structure is correct
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_keys';
  `);
}

// 実行
checkApiKeys().catch(console.error);