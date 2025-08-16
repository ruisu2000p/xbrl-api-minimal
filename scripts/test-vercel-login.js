#!/usr/bin/env node

/**
 * Vercel本番環境のログインテスト
 */

import fetch from 'node-fetch';

async function testVercelLogin() {
  console.log('🌐 Testing Vercel Production Login\n');

  const accounts = [
    { email: 'pumpkin8000@gmail.com', password: 'Password8000!' },
    { email: 'pumpkin3020@gmail.com', password: 'Password3020!' }
  ];

  // 1. 環境変数チェック（デバッグエンドポイント）
  console.log('1️⃣ Checking environment on Vercel:');
  console.log('─'.repeat(50));
  
  try {
    const envCheck = await fetch('https://xbrl-api-minimal.vercel.app/api/auth/login', {
      method: 'GET'
    });
    
    if (envCheck.ok) {
      const envData = await envCheck.json();
      console.log('Environment status:', JSON.stringify(envData, null, 2));
    } else {
      console.log('GET endpoint not available (expected)');
    }
  } catch (err) {
    console.log('Error checking environment:', err.message);
  }
  console.log('');

  // 2. ログインテスト
  console.log('2️⃣ Testing login endpoint:');
  console.log('─'.repeat(50));

  for (const account of accounts) {
    console.log(`\nTesting: ${account.email}`);
    
    try {
      const response = await fetch('https://xbrl-api-minimal.vercel.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      });

      const text = await response.text();
      
      try {
        const result = JSON.parse(text);
        
        if (response.ok) {
          console.log('✅ Login successful');
          console.log('   User:', result.user?.email);
          console.log('   API Key:', result.user?.apiKey || 'Not provided');
        } else {
          console.log('❌ Login failed');
          console.log('   Status:', response.status);
          console.log('   Error:', result.error);
          if (result.details) {
            console.log('   Details:', result.details);
          }
        }
      } catch (parseError) {
        console.log('❌ Response is not JSON');
        console.log('   Status:', response.status);
        console.log('   Response:', text.substring(0, 200));
      }
    } catch (err) {
      console.log('❌ Request failed:', err.message);
    }
  }

  // 3. 代替：登録エンドポイントのテスト
  console.log('\n3️⃣ Testing register endpoint (GET):');
  console.log('─'.repeat(50));

  try {
    const registerCheck = await fetch('https://xbrl-api-minimal.vercel.app/api/auth/register?email=pumpkin8000@gmail.com');
    
    if (registerCheck.ok) {
      const data = await registerCheck.json();
      console.log('User data from register endpoint:', JSON.stringify(data, null, 2));
    } else {
      console.log('Status:', registerCheck.status);
    }
  } catch (err) {
    console.log('Error:', err.message);
  }

  console.log('\n📌 Solutions:');
  console.log('─'.repeat(50));
  console.log('1. Set environment variables in Vercel Dashboard:');
  console.log('   https://vercel.com/dashboard/project/xbrl-api-minimal/settings/environment-variables');
  console.log('');
  console.log('2. Required variables:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('3. After setting, redeploy the application');
}

testVercelLogin().catch(console.error);