require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function modifySchema() {
  console.log('===========================================');
  console.log('データベーススキーマ修正スクリプト');
  console.log('===========================================');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  try {
    // 1. 新しいテーブル作成: financial_documents (個別ファイル保存用)
    console.log('📋 1. financial_documentsテーブルを作成中...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS financial_documents (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL,
        fiscal_year INTEGER NOT NULL,
        doc_category VARCHAR(20) NOT NULL, -- 'public' or 'audit'
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
        
        -- インデックス
        UNIQUE(company_id, fiscal_year, doc_category, file_name)
      );
      
      -- インデックスを追加
      CREATE INDEX IF NOT EXISTS idx_financial_documents_company ON financial_documents(company_id);
      CREATE INDEX IF NOT EXISTS idx_financial_documents_year ON financial_documents(fiscal_year);
      CREATE INDEX IF NOT EXISTS idx_financial_documents_category ON financial_documents(doc_category);
      CREATE INDEX IF NOT EXISTS idx_financial_documents_type ON financial_documents(file_type);
    `;

    const { data: createResult, error: createError } = await supabase
      .rpc('exec_sql', { sql: createTableSQL });

    if (createError) {
      // RPCが存在しない場合は直接SQLを実行できないため、Supabaseダッシュボードで実行する必要がある
      console.log('⚠️  テーブル作成はSupabaseダッシュボードで以下のSQLを実行してください:');
      console.log('');
      console.log(createTableSQL);
      console.log('');
    } else {
      console.log('✅ financial_documentsテーブルを作成しました');
    }

    // 2. financial_reportsテーブルのdoc_type制約を確認
    console.log('');
    console.log('📋 2. 既存データの確認...');
    
    const { count: reportCount } = await supabase
      .from('financial_reports')
      .select('*', { count: 'exact', head: true });
    
    console.log(`現在のfinancial_reportsレコード数: ${reportCount}`);

    // 3. 既存のfinancial_reportsテーブルを参照用に保持
    console.log('');
    console.log('📋 3. データ移行の準備...');
    console.log('');
    console.log('既存のfinancial_reportsテーブルは保持します。');
    console.log('新しいfinancial_documentsテーブルで個別ファイルを管理します。');
    
    // 4. サンプルデータ確認
    console.log('');
    console.log('📋 4. サンプルデータ確認...');
    
    const { data: sampleReports, error: sampleError } = await supabase
      .from('financial_reports')
      .select('company_id, fiscal_year, doc_type, metadata')
      .limit(3);
    
    if (sampleReports && sampleReports.length > 0) {
      console.log('サンプルレポート:');
      sampleReports.forEach(report => {
        console.log(`  - ${report.company_id}: ${report.fiscal_year}年 (${report.doc_type})`);
        if (report.metadata?.files) {
          console.log(`    ファイル数: ${report.metadata.files.length}`);
        }
      });
    }

    console.log('');
    console.log('===========================================');
    console.log('スキーマ修正準備完了');
    console.log('===========================================');
    console.log('');
    console.log('次のステップ:');
    console.log('1. Supabaseダッシュボードで上記SQLを実行（必要な場合）');
    console.log('2. upload-multiple-files.jsスクリプトを実行');
    console.log('3. 全企業の全ファイルをアップロード');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// 実行
modifySchema();