#!/usr/bin/env node

/**
 * パスワードリセットスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function resetPassword() {
  console.log('🔐 Password Reset Tool\n');

  // メールアドレスを取得（コマンドライン引数または入力）
  const email = process.argv[2] || await prompt('Enter email address: ');
  
  if (!email) {
    console.log('❌ Email address is required');
    rl.close();
    return;
  }

  // 新しいパスワードを取得
  const newPassword = await prompt('Enter new password (min 8 characters): ');
  
  if (!newPassword || newPassword.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    rl.close();
    return;
  }

  console.log('\nResetting password for:', email);
  console.log('New password:', '*'.repeat(newPassword.length));

  try {
    // ユーザーを検索
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found:', email);
      rl.close();
      return;
    }

    // パスワードを更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.log('❌ Failed to reset password:');
      console.log('   Error:', error.message);
    } else {
      console.log('✅ Password reset successful!');
      console.log('   User ID:', user.id);
      console.log('   Email:', email);
      console.log('   New password is now active');
      
      // ログインテスト
      console.log('\n🔑 Testing login with new password...');
      const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: newPassword
      });

      if (loginError) {
        console.log('⚠️  Login test failed:', loginError.message);
      } else {
        console.log('✅ Login test successful!');
      }
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  rl.close();
}

// デフォルトパスワードでリセット（引数指定時）
async function quickReset() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (email && password) {
    console.log('🔐 Quick Password Reset\n');
    console.log('Email:', email);
    console.log('Password:', '*'.repeat(password.length));

    try {
      // ユーザーを検索
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);

      if (!user) {
        console.log('❌ User not found:', email);
        return;
      }

      // パスワードを更新
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: password }
      );

      if (error) {
        console.log('❌ Failed:', error.message);
      } else {
        console.log('✅ Password reset successful!');
        console.log('\nYou can now login with:');
        console.log('  Email:', email);
        console.log('  Password:', password);
      }
    } catch (err) {
      console.log('❌ Error:', err.message);
    }

    rl.close();
  } else {
    // インタラクティブモード
    resetPassword();
  }
}

// 実行
quickReset();