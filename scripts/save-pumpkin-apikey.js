#!/usr/bin/env node

/**
 * pumpkin8000@gmail.com の新しいAPIキーを保存
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

async function savePumpkinApiKey() {
  const email = 'pumpkin8000@gmail.com';
  const apiKey = 'xbrl_live_BJRCDnU5BhKTvA2vzj2UOrYU45fGDK61';
  
  console.log('🔑 Registering API key for pumpkin8000@gmail.com\n');
  console.log('Email:', email);
  console.log('API Key:', apiKey);
  
  // ハッシュ値を計算
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');
  const keyPrefix = apiKey.substring(0, 16);
  const keySuffix = apiKey.slice(-4);
  
  console.log('Key Hash:', keyHash);
  console.log('Prefix:', keyPrefix);
  console.log('Suffix:', keySuffix);
  console.log('');

  // 1. ユーザーを確認/作成
  console.log('Step 1: Checking/Creating user...');
  
  let userId;
  
  // 既存ユーザーを確認
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);
  
  if (existingUser) {
    userId = existingUser.id;
    console.log('✅ User already exists:', email);
    console.log('   User ID:', userId);
  } else {
    // 新規ユーザー作成
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'TempPassword2025!', // 仮パスワード
      email_confirm: true,
      user_metadata: {
        name: 'Pumpkin User'
      }
    });

    if (userError) {
      console.error('❌ Failed to create user:', userError);
      return;
    }

    userId = newUser.user.id;
    console.log('✅ Created new user:', email);
    console.log('   User ID:', userId);
  }

  // 2. APIキーが既に存在するか確認
  console.log('\nStep 2: Checking if API key exists...');
  const { data: existing } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .single();

  if (existing) {
    console.log('⚠️  API key already exists!');
    console.log('   Updating user association...');
    
    // ユーザーIDを更新
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    
    if (!updateError) {
      console.log('✅ Updated API key owner to:', email);
    }
    return;
  }

  // 3. 新規APIキーを保存
  console.log('\nStep 3: Saving new API key...');
  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: 'Production API Key (pumpkin8000)',
      key_prefix: keyPrefix,
      key_suffix: keySuffix,
      key_hash: keyHash,
      is_active: true,
      status: 'active',
      environment: 'production',
      permissions: {
        endpoints: ['*'],
        scopes: ['read:markdown'],
        rate_limit: 10000
      },
      metadata: {
        created_via: 'dashboard',
        user_email: email
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
    return;
  }

  console.log('✅ API key saved successfully!');
  console.log('   ID:', newKey.id);

  // 4. 他のAPIキーも同じユーザーに紐付け
  console.log('\nStep 4: Linking other API keys to same user...');
  const otherKeys = [
    'xbrl_live_RI6So0',  // 以前のキー
    'xbrl_live_oLk1j9'   // 最初のキー
  ];

  for (const prefix of otherKeys) {
    const { error } = await supabase
      .from('api_keys')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('key_prefix', prefix);
    
    if (!error) {
      console.log(`   ✅ Linked ${prefix}... to ${email}`);
    }
  }

  // 5. 最終確認
  console.log('\nStep 5: Final verification...');
  const { data: allKeys } = await supabase
    .from('api_keys')
    .select('key_prefix, key_suffix, name, is_active')
    .eq('user_id', userId);

  console.log(`\n📊 Total API keys for ${email}: ${allKeys?.length || 0}`);
  allKeys?.forEach(k => {
    console.log(`   - ${k.key_prefix}...${k.key_suffix} (${k.name}) [${k.is_active ? 'Active' : 'Inactive'}]`);
  });

  console.log('\n🎉 Complete! All API keys are now associated with:', email);
}

// 実行
savePumpkinApiKey().catch(console.error);