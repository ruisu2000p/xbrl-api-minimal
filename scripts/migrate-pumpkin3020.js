#!/usr/bin/env node

/**
 * pumpkin3020@gmail.comをVercelメモリからSupabaseに移行
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

async function migratePumpkin3020() {
  // Vercelメモリに保存されていたデータ
  const vercelData = {
    email: 'pumpkin3020@gmail.com',
    name: 'dd',
    apiKey: 'xbrl_live_SAr2BVYIwK0fJIoQsh1I6n8l1WArNqy0',
    plan: 'beta',
    createdAt: '2025-08-16T04:54:52.917Z'
  };

  console.log('📦 Migrating pumpkin3020@gmail.com from Vercel memory to Supabase...\n');
  console.log('Original data from Vercel:');
  console.log('  Email:', vercelData.email);
  console.log('  Name:', vercelData.name);
  console.log('  API Key:', vercelData.apiKey);
  console.log('  Plan:', vercelData.plan);
  console.log('');

  try {
    // Step 1: 既存ユーザーをチェック
    console.log('Step 1: Checking for existing user...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === vercelData.email);
    
    if (existingUser) {
      console.log('⚠️  User already exists in Supabase');
      console.log('   User ID:', existingUser.id);
      console.log('   This user may have been registered through the new system');
      return;
    }

    // Step 2: Supabase Authにユーザーを作成
    console.log('\nStep 2: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: vercelData.email,
      password: 'TempPassword2025!', // 仮パスワード（ユーザーに変更を促す）
      email_confirm: true,
      user_metadata: {
        name: vercelData.name,
        plan: vercelData.plan,
        migrated_from: 'vercel_memory',
        original_created_at: vercelData.createdAt
      }
    });

    if (authError) {
      console.error('❌ Failed to create user in auth:', authError);
      return;
    }

    const userId = authData.user.id;
    console.log('✅ User created in Supabase Auth');
    console.log('   User ID:', userId);

    // Step 3: public.usersテーブルにも追加
    console.log('\nStep 3: Adding to public.users table...');
    const { error: dbUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: vercelData.email,
        name: vercelData.name,
        created_at: vercelData.createdAt,
        updated_at: new Date().toISOString()
      });

    if (dbUserError && dbUserError.code !== '23505') {
      console.error('⚠️ Warning:', dbUserError.message);
    } else {
      console.log('✅ Added to public.users table');
    }

    // Step 4: APIキーを保存
    console.log('\nStep 4: Saving API key...');
    const keyHash = crypto.createHash('sha256').update(vercelData.apiKey).digest('base64');
    const keyPrefix = vercelData.apiKey.substring(0, 16);
    const keySuffix = vercelData.apiKey.slice(-4);

    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Migrated API Key',
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        key_hash: keyHash,
        is_active: true,
        status: 'active',
        environment: 'production',
        permissions: {
          endpoints: ['*'],
          scopes: ['read:markdown', 'read:companies', 'read:documents'],
          rate_limit: 1000
        },
        metadata: {
          created_via: 'migration',
          user_email: vercelData.email,
          plan: vercelData.plan,
          migrated_from: 'vercel_memory',
          original_created_at: vercelData.createdAt
        },
        created_by: userId,
        tier: vercelData.plan,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        created_at: vercelData.createdAt,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('❌ Failed to save API key:', apiKeyError);
    } else {
      console.log('✅ API key saved successfully');
      console.log('   Key ID:', apiKeyData.id);
    }

    // Step 5: 確認
    console.log('\n📊 Migration Summary:');
    console.log('========================================');
    console.log('✅ User migrated successfully');
    console.log('   Email:', vercelData.email);
    console.log('   User ID:', userId);
    console.log('   API Key:', `${keyPrefix}...${keySuffix}`);
    console.log('');
    console.log('⚠️  Important:');
    console.log('   1. User should reset their password');
    console.log('   2. Temporary password: TempPassword2025!');
    console.log('   3. API key remains the same: ' + vercelData.apiKey);
    console.log('');
    console.log('🔗 View in Supabase:');
    console.log('   Users: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
    console.log('   API Keys: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// 実行
migratePumpkin3020().catch(console.error);