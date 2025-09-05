#!/usr/bin/env node

/**
 * セキュアAPIセットアップスクリプト
 * Supabaseのテーブルとストレージを初期化
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function setupStorage() {
  console.log('📦 Setting up Storage bucket...');
  
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'markdown-files';
  
  // バケットの作成または確認
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError);
    return false;
  }
  
  const bucketExists = buckets?.some(b => b.name === bucketName);
  
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false, // プライベートバケット
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError);
      return false;
    }
    
    console.log(`✅ Created storage bucket: ${bucketName}`);
  } else {
    console.log(`✅ Storage bucket already exists: ${bucketName}`);
  }
  
  return true;
}

async function createSampleDocuments() {
  console.log('📄 Creating sample documents...');
  
  const sampleDocs = [
    {
      path: 'samples/toyota_2021.md',
      title: 'トヨタ自動車 2021年度 有価証券報告書',
      company_code: '7203',
      company_name: 'トヨタ自動車株式会社',
      fiscal_year: '2021',
      doc_type: 'public',
      storage_key: 'samples/7203_2021_public.md',
    },
    {
      path: 'samples/sony_2021.md',
      title: 'ソニーグループ 2021年度 有価証券報告書',
      company_code: '6758',
      company_name: 'ソニーグループ株式会社',
      fiscal_year: '2021',
      doc_type: 'public',
      storage_key: 'samples/6758_2021_public.md',
    },
  ];
  
  for (const doc of sampleDocs) {
    // サンプルMarkdownコンテンツ
    const content = `# ${doc.title}

## 企業概要
- 会社名: ${doc.company_name}
- 証券コード: ${doc.company_code}
- 会計年度: ${doc.fiscal_year}年度

## 財務ハイライト
### 売上高
- 当期: XXX億円
- 前期: XXX億円
- 増減率: X.X%

### 営業利益
- 当期: XXX億円
- 前期: XXX億円
- 増減率: X.X%

### 当期純利益
- 当期: XXX億円
- 前期: XXX億円
- 増減率: X.X%

## 事業セグメント
1. セグメントA
2. セグメントB
3. セグメントC

---
*これはサンプルデータです。実際の財務データではありません。*
`;
    
    // Storageにアップロード
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'markdown-files';
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(doc.storage_key, content, {
        contentType: 'text/markdown',
        upsert: true,
      });
    
    if (uploadError) {
      console.error(`❌ Failed to upload ${doc.storage_key}:`, uploadError);
      continue;
    }
    
    // メタデータをデータベースに保存
    const { error: dbError } = await supabase
      .from('documents')
      .upsert({
        ...doc,
        file_size: Buffer.byteLength(content, 'utf8'),
        content_hash: require('crypto').createHash('md5').update(content).digest('hex'),
      }, {
        onConflict: 'storage_key',
      });
    
    if (dbError) {
      console.error(`❌ Failed to save document metadata:`, dbError);
      continue;
    }
    
    console.log(`✅ Created sample document: ${doc.title}`);
  }
  
  return true;
}

async function main() {
  console.log('🚀 Starting Secure API Setup...\n');
  
  // 環境変数チェック
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('Please copy .env.example to .env.local and fill in the values.');
    process.exit(1);
  }
  
  // 1. SQLスキーマの表示
  console.log('📋 Database Schema Setup Instructions:');
  console.log('----------------------------------------');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Open SQL Editor');
  console.log('3. Run the SQL from: sql/secure-api-keys-schema.sql');
  console.log('4. Verify tables are created: api_keys, documents, api_access_logs');
  console.log('');
  
  // 2. ストレージセットアップ
  const storageOk = await setupStorage();
  if (!storageOk) {
    console.error('❌ Storage setup failed');
    process.exit(1);
  }
  
  // 3. サンプルドキュメント作成
  const docsOk = await createSampleDocuments();
  if (!docsOk) {
    console.error('⚠️ Some sample documents failed to create');
  }
  
  console.log('\n✅ Setup completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Visit http://localhost:3000 to register a user');
  console.log('3. Create an API key from the dashboard');
  console.log('4. Configure Claude Desktop with the API key');
  console.log('\nSee SETUP_GUIDE.md for detailed instructions.');
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});