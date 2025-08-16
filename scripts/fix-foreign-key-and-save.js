#!/usr/bin/env node

/**
 * 外部キー制約を解決してAPIキーを保存
 * 
 * 問題：api_keysテーブルがpublic.usersテーブルを参照しているが、
 * Supabase Authのauth.usersテーブルとは別
 * 
 * 解決策：public.usersテーブルにもユーザーを作成
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

async function setupUserAndApiKey() {
  const email = 'pumpkin8000@gmail.com';
  const apiKey = 'xbrl_live_BJRCDnU5BhKTvA2vzj2UOrYU45fGDK61';
  
  console.log('🔧 Setting up user and API key management system\n');
  console.log('Email:', email);
  console.log('API Key:', apiKey);
  console.log('');

  // APIキーのハッシュ化
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');
  const keyPrefix = apiKey.substring(0, 16);
  const keySuffix = apiKey.slice(-4);

  try {
    // Step 1: auth.usersテーブルでユーザーを作成/取得
    console.log('Step 1: Setting up auth.users...');
    let authUserId;
    
    // 既存ユーザーを確認
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);
    
    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      console.log('✅ Auth user exists:', authUserId);
    } else {
      // 新規ユーザー作成
      const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'SecurePassword2025!',
        email_confirm: true,
        user_metadata: {
          name: 'Pumpkin User',
          tier: 'pro'
        }
      });

      if (authError) {
        console.error('❌ Auth user creation failed:', authError);
        return;
      }

      authUserId = newAuthUser.user.id;
      console.log('✅ Created auth user:', authUserId);
    }

    // Step 2: public.usersテーブルにも同じユーザーを作成
    console.log('\nStep 2: Setting up public.users...');
    
    // まず既存のユーザーを確認
    const { data: existingPublicUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();

    if (existingPublicUser) {
      console.log('✅ Public user already exists');
    } else {
      // public.usersテーブルに挿入
      const { error: publicUserError } = await supabase
        .from('users')
        .insert({
          id: authUserId,  // auth.usersと同じIDを使用
          email: email,
          name: 'Pumpkin User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (publicUserError) {
        // エラーが重複キーの場合は問題なし
        if (publicUserError.code !== '23505') {
          console.error('⚠️ Public user creation warning:', publicUserError.message);
        } else {
          console.log('✅ Public user already exists (duplicate key)');
        }
      } else {
        console.log('✅ Created public user');
      }
    }

    // Step 3: APIキーが既に存在するか確認
    console.log('\nStep 3: Checking existing API keys...');
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .single();

    if (existingKey) {
      console.log('⚠️ API key already exists');
      
      // ユーザーIDを更新
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ 
          user_id: authUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id);
      
      if (!updateError) {
        console.log('✅ Updated API key owner to:', email);
      } else {
        console.error('❌ Failed to update:', updateError);
      }
    } else {
      // Step 4: 新規APIキーを保存
      console.log('\nStep 4: Saving new API key...');
      const { data: newKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: authUserId,
          name: 'Production API Key',
          key_prefix: keyPrefix,
          key_suffix: keySuffix,
          key_hash: keyHash,
          is_active: true,
          status: 'active',
          environment: 'production',
          permissions: {
            endpoints: ['*'],
            scopes: ['read:markdown', 'read:companies', 'read:documents'],
            rate_limit: 10000
          },
          metadata: {
            created_via: 'admin_script',
            user_email: email,
            purpose: 'Claude Desktop MCP Integration'
          },
          created_by: authUserId,
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
    }

    // Step 5: 他の既存APIキーも同じユーザーに紐付け
    console.log('\nStep 5: Linking other API keys...');
    const otherPrefixes = [
      'xbrl_live_RI6So0',
      'xbrl_live_oLk1j9'
    ];

    for (const prefix of otherPrefixes) {
      const { data: otherKey } = await supabase
        .from('api_keys')
        .select('id')
        .eq('key_prefix', prefix)
        .single();

      if (otherKey) {
        const { error } = await supabase
          .from('api_keys')
          .update({ 
            user_id: authUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', otherKey.id);
        
        if (!error) {
          console.log(`   ✅ Linked ${prefix}... to ${email}`);
        }
      }
    }

    // Step 6: 最終確認
    console.log('\nStep 6: Final verification...');
    const { data: allKeys } = await supabase
      .from('api_keys')
      .select('key_prefix, key_suffix, name, is_active, created_at')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false });

    console.log(`\n📊 Summary for ${email}:`);
    console.log(`   Total API keys: ${allKeys?.length || 0}`);
    
    if (allKeys && allKeys.length > 0) {
      console.log('\n   API Keys:');
      allKeys.forEach(k => {
        const status = k.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`   • ${k.key_prefix}...${k.key_suffix} - ${k.name} [${status}]`);
      });
    }

    // Step 7: テーブル構造の確認
    console.log('\n📋 Table Structure Check:');
    
    // usersテーブルの存在確認
    const { data: tables } = await supabase.rpc('get_table_info', {
      table_name: 'users',
      schema_name: 'public'
    }).catch(() => ({ data: null }));
    
    if (tables) {
      console.log('   ✅ public.users table exists');
    } else {
      console.log('   ⚠️ public.users table might not exist or is not accessible');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Verify in Supabase Dashboard: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325');
    console.log('   2. Test API key with: curl -H "Authorization: Bearer ' + apiKey + '" https://xbrl-api-minimal.vercel.app/api/v1/companies');
    console.log('   3. Configure Claude Desktop MCP with this API key');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// 実行
setupUserAndApiKey().catch(console.error);