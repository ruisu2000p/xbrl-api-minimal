require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化（Service Roleキーが必要）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFinancialDocumentsTable() {
  console.log('===========================================');
  console.log('Financial Documentsテーブル作成');
  console.log('===========================================');
  console.log('');

  try {
    // まず既存のテーブルを確認
    console.log('📋 既存テーブルの確認...');
    
    const { data: testQuery, error: testError } = await supabase
      .from('financial_documents')
      .select('id')
      .limit(1);

    if (!testError || !testError.message.includes('relation')) {
      console.log('✅ financial_documentsテーブルは既に存在します');
      
      // テーブルの統計を表示
      const { count } = await supabase
        .from('financial_documents')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   現在のレコード数: ${count || 0}`);
      return;
    }

    console.log('⚠️ テーブルが存在しません。Supabaseダッシュボードで作成してください。');
    console.log('');
    console.log('===========================================');
    console.log('手動でのテーブル作成手順');
    console.log('===========================================');
    console.log('');
    console.log('1. Supabaseダッシュボードにログイン');
    console.log('   https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].replace('https://', ''));
    console.log('');
    console.log('2. 左メニューから「SQL Editor」を選択');
    console.log('');
    console.log('3. 「New query」をクリック');
    console.log('');
    console.log('4. 以下のSQLをコピーして貼り付け：');
    console.log('');
    console.log('----------------------------------------');
    console.log(`
-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- financial_documentsテーブルを作成
CREATE TABLE IF NOT EXISTS financial_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  doc_category VARCHAR(20) NOT NULL CHECK (doc_category IN ('public', 'audit')),
  file_name VARCHAR(255) NOT NULL,
  file_order VARCHAR(20),
  file_type VARCHAR(50),
  storage_path TEXT NOT NULL,
  content_preview TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 外部キー制約
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ユニーク制約
  UNIQUE(company_id, fiscal_year, doc_category, file_name)
);

-- インデックスを追加
CREATE INDEX idx_financial_documents_company ON financial_documents(company_id);
CREATE INDEX idx_financial_documents_year ON financial_documents(fiscal_year);
CREATE INDEX idx_financial_documents_category ON financial_documents(doc_category);
CREATE INDEX idx_financial_documents_type ON financial_documents(file_type);
CREATE INDEX idx_financial_documents_company_year ON financial_documents(company_id, fiscal_year);

-- RLSポリシーを追加
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON financial_documents
  FOR SELECT USING (true);
    `);
    console.log('----------------------------------------');
    console.log('');
    console.log('5. 「Run」ボタンをクリックして実行');
    console.log('');
    console.log('6. 成功したら、このスクリプトを再実行して確認');
    console.log('');

    // 既存テーブルの情報も表示
    console.log('===========================================');
    console.log('既存データの統計');
    console.log('===========================================');
    
    const { count: companyCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    const { count: reportCount } = await supabase
      .from('financial_reports')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 companies: ${companyCount || 0}社`);
    console.log(`📊 financial_reports: ${reportCount || 0}レコード`);
    console.log('');
    console.log('テーブル作成後、upload-multiple-files.jsを実行してください。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// 実行
createFinancialDocumentsTable();