#!/usr/bin/env node

/**
 * ログイン機能のテストとデバッグ
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  // テストするアカウント
  const accounts = [
    { email: 'pumpkin8000@gmail.com', password: 'SecurePassword2025!' },
    { email: 'pumpkin3020@gmail.com', password: 'TempPassword2025!' }
  ];

  console.log('🔑 Testing login functionality...\n');

  for (const account of accounts) {
    console.log(`Testing: ${account.email}`);
    console.log('─'.repeat(50));

    try {
      // Supabaseでログイン試行
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });

      if (error) {
        console.log('❌ Login failed:');
        console.log('   Error code:', error.status);
        console.log('   Error message:', error.message);
        console.log('   Error name:', error.name);
        
        // よくあるエラーの診断
        if (error.message.includes('Invalid login credentials')) {
          console.log('   診断: パスワードが間違っているか、ユーザーが存在しません');
        } else if (error.message.includes('Email not confirmed')) {
          console.log('   診断: メールアドレスが確認されていません');
        }
      } else if (data.user) {
        console.log('✅ Login successful!');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);
        console.log('   Created:', new Date(data.user.created_at).toLocaleString());
        console.log('   Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        console.log('   Metadata:', JSON.stringify(data.user.user_metadata, null, 2));
      }
    } catch (err) {
      console.log('❌ Unexpected error:', err.message);
    }

    console.log('');
  }

  // ユーザー一覧を確認（Admin権限で）
  console.log('📋 Checking all users in database...');
  console.log('─'.repeat(50));

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  
  if (users?.users) {
    console.log(`Found ${users.users.length} users:\n`);
    users.users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log('');
    });
  }

  // パスワードリセット方法の説明
  console.log('💡 Password Reset Instructions:');
  console.log('─'.repeat(50));
  console.log('If login fails, you can reset the password:');
  console.log('1. Use the password reset API endpoint');
  console.log('2. Or update directly in Supabase Dashboard');
  console.log('3. Or run: node scripts/reset-password.js <email>');
}

testLogin().catch(console.error);