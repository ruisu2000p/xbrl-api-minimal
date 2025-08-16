#!/usr/bin/env node

/**
 * APIキーの所有者（メールアドレス）を確認
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkApiKeyOwner() {
  const apiKey = 'xbrl_live_GiYfmDkeiExAAJv9ttRCpmd9E3YTW1VD';
  
  console.log('🔍 Checking API Key Owner\n');
  console.log('API Key:', apiKey);
  console.log('─'.repeat(60));
  
  // APIキーの情報を抽出
  const keyPrefix = apiKey.substring(0, 16);
  const keySuffix = apiKey.slice(-4);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');
  
  console.log('Key Prefix:', keyPrefix);
  console.log('Key Suffix:', keySuffix);
  console.log('Key Hash:', keyHash);
  console.log('');

  try {
    // 1. APIキーをデータベースで検索
    console.log('📦 Searching in Supabase Database:');
    console.log('─'.repeat(60));
    
    // プレフィックスで検索
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .single();

    if (apiKeyError) {
      console.log('❌ API key not found in database');
      console.log('   Error:', apiKeyError.message);
      
      // 全APIキーを表示（デバッグ用）
      const { data: allKeys } = await supabaseAdmin
        .from('api_keys')
        .select('key_prefix, key_suffix, user_id, created_at');
      
      console.log('\n📋 All API keys in database:');
      if (allKeys && allKeys.length > 0) {
        allKeys.forEach(k => {
          console.log(`   • ${k.key_prefix}...${k.key_suffix}`);
          console.log(`     User ID: ${k.user_id}`);
          console.log(`     Created: ${new Date(k.created_at).toLocaleString()}`);
        });
      } else {
        console.log('   No API keys found');
      }
      return;
    }

    if (!apiKeyData) {
      console.log('❌ API key not found');
      return;
    }

    console.log('✅ API Key Found!');
    console.log('   ID:', apiKeyData.id);
    console.log('   Name:', apiKeyData.name);
    console.log('   Display:', `${apiKeyData.key_prefix}...${apiKeyData.key_suffix}`);
    console.log('   Active:', apiKeyData.is_active ? 'Yes' : 'No');
    console.log('   Status:', apiKeyData.status);
    console.log('   Created:', new Date(apiKeyData.created_at).toLocaleString());
    console.log('   User ID:', apiKeyData.user_id);

    // 2. ユーザー情報を取得
    console.log('\n👤 Fetching User Information:');
    console.log('─'.repeat(60));
    
    // auth.usersから取得
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.id === apiKeyData.user_id);
    
    if (authUser) {
      console.log('✅ User Found in Auth System:');
      console.log('   Email:', authUser.email);
      console.log('   User ID:', authUser.id);
      console.log('   Created:', new Date(authUser.created_at).toLocaleString());
      console.log('   Last Sign In:', authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Never');
      console.log('   Metadata:', JSON.stringify(authUser.user_metadata, null, 2));
    } else {
      console.log('⚠️  User not found in auth.users');
      
      // public.usersから取得を試みる
      const { data: publicUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', apiKeyData.user_id)
        .single();
      
      if (publicUser) {
        console.log('✅ User Found in public.users:');
        console.log('   Email:', publicUser.email);
        console.log('   Name:', publicUser.name);
        console.log('   User ID:', publicUser.id);
      } else {
        console.log('❌ User not found in any table');
      }
    }

    // 3. この人の他のAPIキーも表示
    console.log('\n🔑 Other API Keys for this user:');
    console.log('─'.repeat(60));
    
    const { data: otherKeys } = await supabaseAdmin
      .from('api_keys')
      .select('key_prefix, key_suffix, name, is_active, created_at')
      .eq('user_id', apiKeyData.user_id)
      .order('created_at', { ascending: false });

    if (otherKeys && otherKeys.length > 0) {
      otherKeys.forEach((k, i) => {
        const isCurrent = k.key_prefix === keyPrefix;
        console.log(`${i + 1}. ${k.key_prefix}...${k.key_suffix} ${isCurrent ? '← THIS KEY' : ''}`);
        console.log(`   Name: ${k.name}`);
        console.log(`   Active: ${k.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(k.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   No other keys found');
    }

    // 4. サマリー
    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    console.log('🔑 API Key:', apiKey);
    console.log('📧 Owner Email:', authUser?.email || publicUser?.email || 'Unknown');
    console.log('👤 User ID:', apiKeyData.user_id);
    console.log('📅 Key Created:', new Date(apiKeyData.created_at).toLocaleString());
    console.log('✅ Status:', apiKeyData.is_active ? 'Active' : 'Inactive');
    
    // 5. Supabase Dashboardリンク
    console.log('\n🔗 View in Supabase Dashboard:');
    console.log('─'.repeat(60));
    console.log('API Keys Table:');
    console.log('https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325');
    console.log('\nUsers:');
    console.log('https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// 実行
checkApiKeyOwner().catch(console.error);