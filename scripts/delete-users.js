#!/usr/bin/env node

/**
 * 指定ユーザーを完全に削除
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function deleteUsers() {
  const usersToDelete = [
    'pumpkin8000@gmail.com',
    'pumpkin3020@gmail.com'
  ];

  console.log('🗑️ User Deletion Tool\n');
  console.log('Users to delete:');
  usersToDelete.forEach(email => console.log(`  • ${email}`));
  console.log('─'.repeat(60));

  for (const email of usersToDelete) {
    console.log(`\n📧 Processing: ${email}`);
    console.log('─'.repeat(40));

    try {
      // 1. ユーザーを検索
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);

      if (!user) {
        console.log('❌ User not found');
        continue;
      }

      const userId = user.id;
      console.log('Found user ID:', userId);

      // 2. APIキーを確認
      console.log('\n🔑 Checking API keys...');
      const { data: apiKeys } = await supabaseAdmin
        .from('api_keys')
        .select('id, key_prefix, key_suffix')
        .eq('user_id', userId);

      if (apiKeys && apiKeys.length > 0) {
        console.log(`Found ${apiKeys.length} API keys:`);
        apiKeys.forEach(key => {
          console.log(`  • ${key.key_prefix}...${key.key_suffix}`);
        });

        // APIキーを削除
        console.log('Deleting API keys...');
        const { error: deleteKeysError } = await supabaseAdmin
          .from('api_keys')
          .delete()
          .eq('user_id', userId);

        if (deleteKeysError) {
          console.log('⚠️  Failed to delete API keys:', deleteKeysError.message);
        } else {
          console.log('✅ API keys deleted');
        }
      } else {
        console.log('No API keys found');
      }

      // 3. public.usersから削除
      console.log('\n📦 Deleting from public.users...');
      const { error: publicUserError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (publicUserError) {
        console.log('⚠️  Failed to delete from public.users:', publicUserError.message);
      } else {
        console.log('✅ Deleted from public.users');
      }

      // 4. auth.usersから削除（最後に実行）
      console.log('\n🔐 Deleting from auth.users...');
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.log('❌ Failed to delete from auth.users:', authError.message);
      } else {
        console.log('✅ User completely deleted');
      }

      console.log(`\n✅ ${email} has been removed from the system`);

    } catch (error) {
      console.error(`❌ Error processing ${email}:`, error);
    }
  }

  // 5. 最終確認
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Final Verification:');
  console.log('─'.repeat(60));

  const { data: remainingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const remainingEmails = remainingUsers?.users?.map(u => u.email) || [];

  console.log('\nRemaining users in system:');
  if (remainingEmails.length > 0) {
    remainingEmails.forEach(email => console.log(`  • ${email}`));
  } else {
    console.log('  No users found');
  }

  // 削除確認
  console.log('\nDeletion status:');
  for (const email of usersToDelete) {
    const exists = remainingEmails.includes(email);
    const status = exists ? '❌ Still exists' : '✅ Successfully deleted';
    console.log(`  ${email}: ${status}`);
  }

  console.log('\n🔗 Verify in Supabase Dashboard:');
  console.log('  https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
}

// 実行
deleteUsers().catch(console.error);