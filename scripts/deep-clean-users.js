#!/usr/bin/env node

/**
 * ユーザーデータを完全にクリーンアップ
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function deepClean() {
  const targetEmails = [
    'pumpkin8000@gmail.com',
    'pumpkin3020@gmail.com'
  ];

  console.log('🔍 Deep Clean - Finding all traces of users\n');
  console.log('Target emails:', targetEmails.join(', '));
  console.log('═'.repeat(60));

  // 1. auth.usersをチェック
  console.log('\n1️⃣ Checking auth.users...');
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  
  for (const email of targetEmails) {
    const user = authUsers?.users?.find(u => u.email === email);
    if (user) {
      console.log(`Found ${email} in auth.users`);
      console.log('  ID:', user.id);
      console.log('  Created:', user.created_at);
      console.log('  Deleting...');
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.log('  ❌ Delete failed:', error.message);
      } else {
        console.log('  ✅ Deleted from auth.users');
      }
    } else {
      console.log(`✅ ${email} not in auth.users`);
    }
  }

  // 2. public.usersをチェック
  console.log('\n2️⃣ Checking public.users table...');
  for (const email of targetEmails) {
    const { data: publicUsers, error: selectError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (publicUsers && publicUsers.length > 0) {
      console.log(`Found ${email} in public.users`);
      publicUsers.forEach(u => {
        console.log('  ID:', u.id);
      });
      
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('email', email);
      
      if (deleteError) {
        console.log('  ❌ Delete failed:', deleteError.message);
      } else {
        console.log('  ✅ Deleted from public.users');
      }
    } else {
      console.log(`✅ ${email} not in public.users`);
    }
  }

  // 3. APIキーをメタデータでチェック
  console.log('\n3️⃣ Checking API keys by metadata...');
  const { data: allKeys } = await supabaseAdmin
    .from('api_keys')
    .select('*');

  if (allKeys) {
    for (const key of allKeys) {
      // metadataのuser_emailをチェック
      const metadata = key.metadata;
      if (metadata && metadata.user_email) {
        if (targetEmails.includes(metadata.user_email)) {
          console.log(`Found API key for ${metadata.user_email}`);
          console.log('  Key:', key.key_prefix + '...' + key.key_suffix);
          
          const { error } = await supabaseAdmin
            .from('api_keys')
            .delete()
            .eq('id', key.id);
          
          if (error) {
            console.log('  ❌ Delete failed:', error.message);
          } else {
            console.log('  ✅ Deleted API key');
          }
        }
      }
    }
  }

  // 4. 認証履歴をチェック（identitiesテーブル）
  console.log('\n4️⃣ Checking auth.identities...');
  try {
    // Supabase Auth Admin APIで全ユーザーを再取得
    const { data: finalUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    // deleted=trueのユーザーも含めて確認
    console.log('Total users in auth system:', finalUsers?.users?.length || 0);
    
    for (const email of targetEmails) {
      const exists = finalUsers?.users?.some(u => u.email === email);
      if (exists) {
        console.log(`⚠️  ${email} still exists in auth system`);
        
        // 強制削除を試みる
        const user = finalUsers.users.find(u => u.email === email);
        if (user) {
          console.log('  Attempting force delete...');
          
          // Supabase管理画面から削除する必要がある場合のメッセージ
          console.log('  ⚠️  If deletion fails, manually delete from:');
          console.log('     https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
          console.log('     User ID:', user.id);
        }
      } else {
        console.log(`✅ ${email} completely removed from auth`);
      }
    }
  } catch (err) {
    console.log('Could not check identities:', err.message);
  }

  // 5. 最終確認
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Final Verification:');
  console.log('─'.repeat(60));

  // もう一度すべてをチェック
  const { data: finalAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
  const { data: finalPublicUsers } = await supabaseAdmin.from('users').select('email');
  const { data: finalKeys } = await supabaseAdmin.from('api_keys').select('metadata');

  console.log('\nauth.users:');
  const authEmails = finalAuthUsers?.users?.map(u => u.email) || [];
  authEmails.forEach(email => console.log('  •', email));

  console.log('\npublic.users:');
  const publicEmails = finalPublicUsers?.map(u => u.email) || [];
  publicEmails.forEach(email => console.log('  •', email));

  console.log('\nAPI keys with metadata:');
  finalKeys?.forEach(k => {
    if (k.metadata?.user_email) {
      console.log('  •', k.metadata.user_email);
    }
  });

  // 削除確認
  console.log('\n✅ Cleanup Status:');
  for (const email of targetEmails) {
    const inAuth = authEmails.includes(email);
    const inPublic = publicEmails.includes(email);
    const inKeys = finalKeys?.some(k => k.metadata?.user_email === email);
    
    if (!inAuth && !inPublic && !inKeys) {
      console.log(`  ${email}: ✅ Completely removed`);
    } else {
      console.log(`  ${email}: ⚠️  Still exists in:`);
      if (inAuth) console.log('    - auth.users');
      if (inPublic) console.log('    - public.users');
      if (inKeys) console.log('    - api_keys metadata');
    }
  }

  console.log('\n🔗 Manual cleanup if needed:');
  console.log('  https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
  console.log('\n✅ Deep clean complete!');
}

deepClean().catch(console.error);