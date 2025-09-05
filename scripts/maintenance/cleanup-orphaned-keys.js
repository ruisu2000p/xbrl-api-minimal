#!/usr/bin/env node

/**
 * 孤立したAPIキーをクリーンアップ
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function cleanup() {
  console.log('🧹 Cleaning up orphaned data...\n');
  
  // 現在のユーザー確認
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('📦 Current Auth Users:', users?.users?.length || 0);
  users?.users?.forEach(u => console.log('  •', u.email));
  
  // 現在のAPIキー確認
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, key_prefix, key_suffix, user_id');
  
  console.log('\n🔑 Current API Keys:', keys?.length || 0);
  keys?.forEach(k => console.log('  •', k.key_prefix + '...' + k.key_suffix, '(User:', k.user_id?.substring(0, 8) + '...)'));
  
  // pumpkin関連のキーを特定
  const pumpkinKeys = keys?.filter(k => {
    const prefixes = ['xbrl_live_BJRCDn', 'xbrl_live_RI6So0', 'xbrl_live_GiYfmD', 'xbrl_live_SAr2BV'];
    return prefixes.includes(k.key_prefix);
  });
  
  if (pumpkinKeys && pumpkinKeys.length > 0) {
    console.log('\n🗑️ Found orphaned keys to delete:');
    pumpkinKeys.forEach(k => console.log('  •', k.key_prefix + '...' + k.key_suffix));
    
    console.log('\nDeleting...');
    for (const key of pumpkinKeys) {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', key.id);
      
      if (error) {
        console.log('  ❌ Failed:', key.key_prefix + '...', error.message);
      } else {
        console.log('  ✅ Deleted:', key.key_prefix + '...' + key.key_suffix);
      }
    }
  } else {
    console.log('\n✅ No orphaned keys found');
  }
  
  // 最終確認
  const { data: finalKeys } = await supabase
    .from('api_keys')
    .select('key_prefix, key_suffix');
  
  console.log('\n📊 Final state:');
  console.log('  Remaining API keys:', finalKeys?.length || 0);
  if (finalKeys && finalKeys.length > 0) {
    finalKeys.forEach(k => console.log('    •', k.key_prefix + '...' + k.key_suffix));
  }
  
  console.log('\n✅ System is clean and ready for testing!');
  console.log('\n📝 You can now register new users at:');
  console.log('  https://xbrl-api-minimal.vercel.app/auth/register');
}

cleanup().catch(console.error);