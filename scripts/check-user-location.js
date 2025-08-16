#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkUserLocation() {
  const email = 'pumpkin3020@gmail.com';
  
  console.log('🔍 Checking where user is stored:', email);
  console.log('');
  
  // 1. Supabase Auth (auth.users)をチェック
  console.log('📦 SUPABASE - Authentication System:');
  console.log('----------------------------------------');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === email);
  
  if (authUser) {
    console.log('✅ Found in Supabase Auth (auth.users table):');
    console.log('   • User ID:', authUser.id);
    console.log('   • Email:', authUser.email);
    console.log('   • Created:', new Date(authUser.created_at).toLocaleString());
    console.log('   • Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('   • Location: Supabase Dashboard > Authentication > Users');
    console.log('   • URL: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
  } else {
    console.log('❌ NOT found in Supabase Auth');
  }
  
  // 2. Supabase Database (public.users)をチェック
  console.log('');
  console.log('📦 SUPABASE - Database (public.users):');
  console.log('----------------------------------------');
  const { data: publicUsers } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);
  
  if (publicUsers && publicUsers.length > 0) {
    console.log('✅ Found in Supabase Database:');
    publicUsers.forEach(u => {
      console.log('   • User ID:', u.id);
      console.log('   • Email:', u.email);
      console.log('   • Name:', u.name || 'Not set');
    });
    console.log('   • Location: Supabase Dashboard > Table Editor > users');
    console.log('   • URL: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor');
  } else {
    console.log('❌ NOT found in public.users table');
  }
  
  // 3. Vercelにはユーザーデータは保存されていない
  console.log('');
  console.log('📦 VERCEL:');
  console.log('----------------------------------------');
  console.log('❌ Vercel does NOT store user data');
  console.log('   • Vercel hosts the application code only');
  console.log('   • All user data is stored in Supabase');
  console.log('   • App URL: https://xbrl-api-minimal.vercel.app/');
  
  // 4. 全ユーザーリスト
  console.log('');
  console.log('📋 ALL REGISTERED USERS IN SUPABASE:');
  console.log('----------------------------------------');
  if (authUsers?.users && authUsers.users.length > 0) {
    authUsers.users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Created: ${new Date(u.created_at).toLocaleDateString()}`);
    });
  } else {
    console.log('No users found');
  }
  
  // 5. データ保管場所のまとめ
  console.log('');
  console.log('📍 DATA STORAGE SUMMARY:');
  console.log('========================================');
  console.log('✅ USER DATA → SUPABASE');
  console.log('   • auth.users table (Authentication)');
  console.log('   • public.users table (Database)');
  console.log('');
  console.log('✅ API KEYS → SUPABASE');
  console.log('   • api_keys table (Database)');
  console.log('');
  console.log('✅ APPLICATION CODE → VERCEL');
  console.log('   • Next.js application');
  console.log('   • API endpoints');
  console.log('');
  console.log('🔗 Direct Links:');
  console.log('   • Supabase Users: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/auth/users');
  console.log('   • Supabase Tables: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/editor/26325');
  console.log('   • Vercel App: https://xbrl-api-minimal.vercel.app/');
}

checkUserLocation().catch(console.error);