#!/usr/bin/env node

/**
 * ログイン問題の詳細デバッグ
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function debugLogin() {
  console.log('🔍 Login Debug Tool\n');
  
  // 1. 環境変数の確認
  console.log('1️⃣ Environment Variables Check:');
  console.log('─'.repeat(50));
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
  console.log('');

  // 2. Supabase接続テスト
  console.log('2️⃣ Supabase Connection Test:');
  console.log('─'.repeat(50));
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Health check
  try {
    const { data, error } = await supabase.from('api_keys').select('count').limit(1);
    if (error) {
      console.log('❌ Database connection failed:', error.message);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }
  console.log('');

  // 3. 直接ログインテスト
  console.log('3️⃣ Direct Supabase Login Test:');
  console.log('─'.repeat(50));
  
  const testAccounts = [
    { email: 'pumpkin8000@gmail.com', password: 'Password8000!' },
    { email: 'pumpkin3020@gmail.com', password: 'Password3020!' }
  ];

  for (const account of testAccounts) {
    console.log(`\nTesting: ${account.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });

      if (error) {
        console.log('❌ Login failed');
        console.log('   Error:', error.message);
        console.log('   Status:', error.status);
        console.log('   Details:', JSON.stringify(error, null, 2));
      } else if (data?.user) {
        console.log('✅ Login successful');
        console.log('   User ID:', data.user.id);
        console.log('   Session:', data.session ? 'Created' : 'Not created');
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
  }
  console.log('');

  // 4. Vercel APIエンドポイントテスト
  console.log('4️⃣ Vercel API Endpoint Test:');
  console.log('─'.repeat(50));
  
  const apiUrl = 'https://xbrl-api-minimal.vercel.app/api/auth/login';
  
  for (const account of testAccounts) {
    console.log(`\nTesting via API: ${account.email}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ API login successful');
        console.log('   Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ API login failed');
        console.log('   Status:', response.status);
        console.log('   Error:', result.error);
      }
    } catch (err) {
      console.log('❌ API call failed:', err.message);
    }
  }
  console.log('');

  // 5. ユーザー存在確認（Admin）
  console.log('5️⃣ User Existence Check (Admin):');
  console.log('─'.repeat(50));
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  
  for (const account of testAccounts) {
    const user = users?.users?.find(u => u.email === account.email);
    if (user) {
      console.log(`\n✅ ${account.email} exists`);
      console.log('   ID:', user.id);
      console.log('   Created:', new Date(user.created_at).toLocaleString());
      console.log('   Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Banned:', user.banned_until ? 'Yes' : 'No');
      console.log('   Metadata:', JSON.stringify(user.user_metadata, null, 2));
      
      // パスワードでログインテスト
      console.log('   Testing password...');
      const { error } = await supabaseAdmin.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });
      
      if (error) {
        console.log('   ❌ Password test failed:', error.message);
      } else {
        console.log('   ✅ Password is correct');
      }
    } else {
      console.log(`\n❌ ${account.email} not found`);
    }
  }
  console.log('');

  // 6. ローカルAPIテスト（開発環境）
  console.log('6️⃣ Local API Test (if running):');
  console.log('─'.repeat(50));
  
  try {
    const localResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'pumpkin8000@gmail.com',
        password: 'Password8000!'
      })
    });

    if (localResponse.ok) {
      console.log('✅ Local API is working');
    } else {
      console.log('⚠️  Local API returned error:', localResponse.status);
    }
  } catch (err) {
    console.log('ℹ️  Local server not running (expected if testing production)');
  }

  console.log('\n📌 Troubleshooting Steps:');
  console.log('─'.repeat(50));
  console.log('1. Clear browser cache and cookies');
  console.log('2. Try incognito/private browsing mode');
  console.log('3. Check browser console for errors');
  console.log('4. Verify you are using the correct URL');
  console.log('5. Make sure you are using the exact password shown above');
}

debugLogin().catch(console.error);