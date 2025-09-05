#!/usr/bin/env node

/**
 * テスト用APIキー生成スクリプト
 * 既知のハッシュ値に対応する平文キーを生成（開発用）
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * 開発用の固定APIキーを生成
 * 注意: 本番環境では絶対に使用しないこと
 */
async function generateTestApiKey() {
  console.log('🔑 Generating test API key...\n');
  
  // テスト用の固定キー（開発環境のみ）
  const testApiKey = 'xbrl_live_test_development_key_2025';
  const keyHash = crypto.createHash('sha256').update(testApiKey).digest('hex');
  
  console.log('Test API Key (DEVELOPMENT ONLY):');
  console.log('================================');
  console.log(`Plain text: ${testApiKey}`);
  console.log(`SHA256 hash: ${keyHash}`);
  console.log('');
  
  // データベースに存在するか確認
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name')
    .eq('key_prefix', 'xbrl_live_test')
    .single();
  
  if (existing) {
    console.log('✅ This key already exists in database:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Name: ${existing.name}`);
    console.log('');
    console.log('📝 To use this key:');
    console.log(`   Authorization: Bearer ${testApiKey}`);
  } else {
    console.log('⚠️  This key does not exist in database yet.');
    console.log('   You need to insert it manually or use the API to create a new one.');
  }
  
  console.log('\n🔧 Testing the key...');
  
  // APIキーをテスト
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/api/v1/markdown/search?limit=1`, {
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
      },
    });
    
    if (response.ok) {
      console.log('✅ API key is working!');
    } else {
      console.log(`❌ API key test failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log('❌ Could not test API key:', error.message);
  }
  
  console.log('\n📋 Claude Desktop Configuration:');
  console.log('================================');
  const config = {
    mcpServers: {
      'xbrl-financial-test': {
        command: 'node',
        args: ['C:/Users/pumpk/Downloads/xbrl-api-minimal/mcp-server-secure.js'],
        env: {
          XBRL_API_URL: 'https://xbrl-api-minimal.vercel.app/api/v1',
          XBRL_API_KEY: testApiKey,
        },
      },
    },
  };
  console.log(JSON.stringify(config, null, 2));
  
  console.log('\n⚠️  SECURITY WARNING:');
  console.log('This is a test key for development only.');
  console.log('Never use fixed keys in production!');
}

// 実行
generateTestApiKey().catch(console.error);