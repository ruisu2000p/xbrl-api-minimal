#!/usr/bin/env node

/**
 * ユーザー登録時のAPIキー自動発行をテスト
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function testRegistrationFlow() {
  // テスト用のユーザー情報
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    company: 'Test Company',
    plan: 'free'
  };

  console.log('🧪 Testing Registration Flow with Auto API Key\n');
  console.log('Test User:', testUser.email);
  console.log('─'.repeat(60));

  try {
    // 1. ローカル環境でテスト（開発中の場合）
    console.log('\n1️⃣ Testing Local Registration (if available):');
    console.log('─'.repeat(60));
    
    try {
      const localResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser)
      });

      if (localResponse.ok) {
        const result = await localResponse.json();
        console.log('✅ Local registration successful');
        console.log('   User ID:', result.user?.id);
        console.log('   API Key:', result.user?.apiKey);
        
        // Supabaseで確認
        await verifyInSupabase(testUser.email);
      } else {
        const error = await localResponse.json();
        console.log('❌ Local registration failed:', error.error);
      }
    } catch (err) {
      console.log('ℹ️  Local server not running');
    }

    // 2. 本番環境でテスト
    console.log('\n2️⃣ Testing Production Registration (Vercel):');
    console.log('─'.repeat(60));
    
    // 新しいメールアドレスを生成（ローカルで使用済みの場合）
    const prodUser = {
      ...testUser,
      email: `prod_test_${Date.now()}@example.com`
    };
    
    const prodResponse = await fetch('https://xbrl-api-minimal.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prodUser)
    });

    if (prodResponse.ok) {
      const result = await prodResponse.json();
      console.log('✅ Production registration successful');
      console.log('   User ID:', result.user?.id);
      console.log('   API Key:', result.user?.apiKey);
      
      if (!result.user?.apiKey) {
        console.log('⚠️  API key was not returned in response');
      }
      
      // Supabaseで確認
      await verifyInSupabase(prodUser.email);
    } else {
      const error = await prodResponse.json();
      console.log('❌ Production registration failed:', error.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // クリーンアップ
  console.log('\n🧹 Cleanup test users...');
  await cleanupTestUsers();
}

async function verifyInSupabase(email) {
  console.log('\n📦 Verifying in Supabase:');
  
  // ユーザーを確認
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);
  
  if (user) {
    console.log('✅ User found in Supabase');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    
    // APIキーを確認
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id);
    
    if (apiKeys && apiKeys.length > 0) {
      console.log('✅ API keys found:', apiKeys.length);
      apiKeys.forEach((key, i) => {
        console.log(`   ${i + 1}. ${key.key_prefix}...${key.key_suffix}`);
        console.log(`      Name: ${key.name}`);
        console.log(`      Active: ${key.is_active}`);
        console.log(`      Created: ${new Date(key.created_at).toLocaleString()}`);
      });
    } else {
      console.log('❌ No API keys found for this user');
    }
  } else {
    console.log('❌ User not found in Supabase');
  }
}

async function cleanupTestUsers() {
  // テストユーザーを削除（オプション）
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUsers = users?.users?.filter(u => 
    u.email?.includes('test_') || u.email?.includes('prod_test_')
  );
  
  if (testUsers && testUsers.length > 0) {
    console.log(`Found ${testUsers.length} test users`);
    for (const user of testUsers) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        console.log(`   Deleted: ${user.email}`);
      } catch (err) {
        console.log(`   Failed to delete: ${user.email}`);
      }
    }
  }
}

// 現在の登録フローの説明
console.log('📋 Current Registration Flow:');
console.log('─'.repeat(60));
console.log('1. User submits: email, password, name');
console.log('2. System creates user in Supabase Auth');
console.log('3. System generates API key automatically');
console.log('4. System saves API key linked to user_id');
console.log('5. Response includes: user info + API key');
console.log('');
console.log('✅ Email ←→ API Key association is automatic!');
console.log('─'.repeat(60));

// テスト実行
testRegistrationFlow().catch(console.error);