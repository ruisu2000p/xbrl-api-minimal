/**
 * Supabase Storage内のMarkdownファイルをスキャンしてメタデータを投入
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ドキュメントタイプのマッピング
const docTypeMap = {
  '0101010': '企業の概況',
  '0102010': '事業の状況',
  '0103010': '設備の状況',
  '0104010': '提出会社の状況',
  '0105010': '経理の状況',
  '0106010': 'コーポレート・ガバナンスの状況等',
  '0201010': '連結財務諸表等',
  '0202010': '財務諸表等'
};

async function scanAndPopulate() {
  console.log('🚀 Storage スキャンを開始します...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log('='.repeat(60));
  
  try {
    // 既存のメタデータをクリア（オプション）
    console.log('🗑️ 既存のメタデータをクリアしています...');
    const { error: deleteError } = await supabase
      .from('markdown_files_metadata')
      .delete()
      .gte('id', 0); // すべて削除
    
    if (deleteError) {
      console.log('⚠️ クリアエラー（無視可）:', deleteError.message);
    }
    
    // companiesテーブルから企業リストを取得
    console.log('\n📊 企業リストを取得中...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, company_name, ticker_code, sector')
      .order('id')
      .limit(10); // まず10社でテスト
    
    if (companiesError) {
      throw companiesError;
    }
    
    console.log(`✅ ${companies.length}社の企業を処理します`);
    
    let totalFiles = 0;
    let successCount = 0;
    let errorCount = 0;
    const fiscalYears = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
    
    // 各企業のファイルをチェック
    for (const company of companies) {
      console.log(`\n🏢 ${company.company_name} (${company.id}) を処理中...`);
      
      for (const year of fiscalYears) {
        const folderPath = `FY${year}/${company.id}/PublicDoc_markdown`;
        
        try {
          // Storageからファイルリストを取得
          const { data: files, error: listError } = await supabase.storage
            .from('markdown-files')
            .list(folderPath, {
              limit: 100,
              offset: 0
            });
          
          if (listError) {
            // フォルダが存在しない場合はスキップ
            continue;
          }
          
          if (files && files.length > 0) {
            console.log(`  📁 FY${year}: ${files.length}ファイル見つかりました`);
            
            // 各ファイルのメタデータを作成
            const metadataRecords = files.map(file => {
              const docTypeCode = file.name.substring(0, 7);
              const docType = docTypeMap[docTypeCode] || 'その他';
              
              return {
                company_id: company.id,
                company_name: company.company_name,
                ticker_code: company.ticker_code,
                fiscal_year: year,
                file_name: file.name,
                file_type: 'markdown',
                file_size: file.metadata?.size || 0,
                storage_bucket: 'markdown-files',
                storage_path: `${folderPath}/${file.name}`,
                sector: company.sector,
                document_type: docType,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            });
            
            // バッチで挿入
            const { error: insertError } = await supabase
              .from('markdown_files_metadata')
              .insert(metadataRecords);
            
            if (insertError) {
              console.error(`  ❌ 挿入エラー:`, insertError.message);
              errorCount += metadataRecords.length;
            } else {
              successCount += metadataRecords.length;
              totalFiles += metadataRecords.length;
            }
          }
        } catch (err) {
          console.log(`  ⚠️ FY${year} スキップ:`, err.message);
        }
      }
    }
    
    // 統計情報を表示
    console.log('\n' + '='.repeat(60));
    console.log('📊 スキャン完了サマリー:');
    console.log('='.repeat(60));
    console.log(`  処理企業数: ${companies.length}社`);
    console.log(`  総ファイル数: ${totalFiles}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${errorCount}`);
    
    // 最終的なメタデータ数を確認
    const { count } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📈 データベース内のメタデータ総数: ${count || 0}件`);
    
    // 年度別統計
    const { data: yearStats } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year')
      .order('fiscal_year');
    
    if (yearStats) {
      const yearCounts = {};
      yearStats.forEach(row => {
        yearCounts[row.fiscal_year] = (yearCounts[row.fiscal_year] || 0) + 1;
      });
      
      console.log('\n📅 年度別ファイル数:');
      Object.entries(yearCounts).sort().forEach(([year, count]) => {
        console.log(`  FY${year}: ${count}件`);
      });
    }
    
    // ドキュメントタイプ別統計
    const { data: docStats } = await supabase
      .from('markdown_files_metadata')
      .select('document_type')
      .order('document_type');
    
    if (docStats) {
      const docCounts = {};
      docStats.forEach(row => {
        const docType = row.document_type || 'その他';
        docCounts[docType] = (docCounts[docType] || 0) + 1;
      });
      
      console.log('\n📄 ドキュメントタイプ別:');
      Object.entries(docCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}件`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  scanAndPopulate()
    .then(() => {
      console.log('\n✅ スキャン完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { scanAndPopulate };