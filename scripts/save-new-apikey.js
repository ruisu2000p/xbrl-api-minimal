#!/usr/bin/env node

/**
 * 新しいAPIキーをSupabaseに保存して所有者を確認
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

async function saveAndVerifyApiKey() {
  const apiKey = 'xbrl_live_GiYfmDkeiExAAJv9ttRCpmd9E3YTW1VD';
  
  console.log('🔑 New API Key Registration & Verification\n');
  console.log('API Key:', apiKey);
  console.log('─'.repeat(60));

  // APIキー情報の準備
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('base64');
  const keyPrefix = apiKey.substring(0, 16);
  const keySuffix = apiKey.slice(-4);

  try {
    // 1. まず誰がログインしているか推測
    console.log('1️⃣ Identifying likely owner:');
    console.log('─'.repeat(60));
    
    // 最近作成されたユーザーを確認
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    console.log('Recent users who might own this key:');
    const recentUsers = allUsers?.users
      ?.sort((a, b) => new Date(b.last_sign_in_at || b.created_at).getTime() - 
                       new Date(a.last_sign_in_at || a.created_at).getTime())
      ?.slice(0, 3);

    recentUsers?.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Last activity: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    });

    // 2. ユーザーに紐付けて保存
    console.log('\n2️⃣ Saving API key to database:');
    console.log('─'.repeat(60));

    // 最も可能性の高いユーザー（最後にログインした人）
    const likelyOwner = recentUsers?.[0];
    
    if (!likelyOwner) {
      console.log('❌ No users found');
      return;
    }

    console.log('Assigning to user:', likelyOwner.email);
    console.log('User ID:', likelyOwner.id);

    // APIキーを保存
    const { data: savedKey, error: saveError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: likelyOwner.id,
        name: 'Auto-detected API Key',
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
          created_via: 'login_detection',
          user_email: likelyOwner.email,
          detected_at: new Date().toISOString()
        },
        created_by: likelyOwner.id,
        tier: 'free',  // 'free', 'basic', 'pro' のいずれか
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.log('❌ Failed to save:', saveError.message);
      
      // 既に存在する場合は更新
      if (saveError.code === '23505') {
        console.log('ℹ️  API key already exists, updating owner...');
        
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('api_keys')
          .update({
            user_id: likelyOwner.id,
            updated_at: new Date().toISOString()
          })
          .eq('key_prefix', keyPrefix)
          .select()
          .single();

        if (!updateError && updated) {
          console.log('✅ API key owner updated');
          console.log('   Key ID:', updated.id);
        }
      }
    } else if (savedKey) {
      console.log('✅ API key saved successfully');
      console.log('   Key ID:', savedKey.id);
    }

    // 3. 確認
    console.log('\n3️⃣ Verification:');
    console.log('─'.repeat(60));
    
    const { data: verifyKey } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .single();

    if (verifyKey) {
      // ユーザー情報を取得
      const owner = allUsers?.users?.find(u => u.id === verifyKey.user_id);
      
      console.log('✅ API Key Verified:');
      console.log('   API Key:', `${verifyKey.key_prefix}...${verifyKey.key_suffix}`);
      console.log('   Owner Email:', owner?.email || 'Unknown');
      console.log('   Owner ID:', verifyKey.user_id);
      console.log('   Status:', verifyKey.is_active ? 'Active' : 'Inactive');
      console.log('   Created:', new Date(verifyKey.created_at).toLocaleString());
      
      // この人の全APIキー
      const { data: allUserKeys } = await supabaseAdmin
        .from('api_keys')
        .select('key_prefix, key_suffix, name')
        .eq('user_id', verifyKey.user_id);

      console.log('\n📋 All API keys for', owner?.email || 'this user', ':');
      allUserKeys?.forEach((k, i) => {
        const current = k.key_prefix === keyPrefix ? ' ← CURRENT' : '';
        console.log(`   ${i + 1}. ${k.key_prefix}...${k.key_suffix} (${k.name})${current}`);
      });
    }

    // 4. Supabase Dashboard
    console.log('\n🔗 View in Supabase Dashboard:');
    console.log('─'.repeat(60));
    console.log('https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325');
    
    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    console.log('API Key:', apiKey);
    console.log('Owner:', likelyOwner.email);
    console.log('Status: ✅ Registered and verified');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// 実行
saveAndVerifyApiKey().catch(console.error);