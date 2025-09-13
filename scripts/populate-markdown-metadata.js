/**
 * Supabase Storageのmarkdown-filesバケットをスキャンして
 * markdown_files_metadataテーブルにデータを投入するスクリプト
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ドキュメントタイプのマッピング
const documentTypeMap = {
  '0101010': '企業の概況',
  '0102010': '事業の状況',
  '0103010': '設備の状況',
  '0104010': '提出会社の状況',
  '0105010': '経理の状況',
  '0106010': 'コーポレート・ガバナンスの状況等',
  '0107010': '監査報告書',
  '0201010': '連結財務諸表等',
  '0202010': '財務諸表等',
  '0203010': 'その他'
};

// セクションタイプの判定
function getSectionType(fileName) {
  const sections = {
    '事業の概要': 'business_overview',
    '業績等の概要': 'performance_overview',
    '生産、受注及び販売の状況': 'production_sales',
    '経営方針': 'management_policy',
    '事業等のリスク': 'business_risks',
    '研究開発活動': 'rd_activities',
    '財政状態': 'financial_position',
    '経営成績': 'operating_results',
    'キャッシュ・フロー': 'cash_flow',
    '連結財務諸表': 'consolidated_fs',
    '財務諸表': 'financial_statements',
    '主要な経営指標': 'key_indicators',
    '株式の状況': 'stock_information',
    '配当政策': 'dividend_policy',
    '役員の状況': 'directors',
    'コーポレート・ガバナンス': 'corporate_governance',
    '内部統制': 'internal_control'
  };

  for (const [key, value] of Object.entries(sections)) {
    if (fileName.includes(key)) {
      return value;
    }
  }
  return 'other';
}

// ファイルサイズをバイト単位で推定（Markdown文字数 * 3 として概算）
function estimateFileSize(content) {
  if (!content) return 0;
  return Buffer.byteLength(content, 'utf8');
}

// ストレージからファイル一覧を取得
async function listStorageFiles(folderPath) {
  try {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .list(folderPath, {
        limit: 1000,
        offset: 0
      });

    if (error) {
      console.error(`❌ ファイル一覧取得エラー (${folderPath}):`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`❌ ストレージアクセスエラー (${folderPath}):`, error);
    return [];
  }
}

// ファイルの内容を取得
async function getFileContent(filePath) {
  try {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .download(filePath);

    if (error) {
      console.error(`❌ ファイルダウンロードエラー (${filePath}):`, error);
      return null;
    }

    const text = await data.text();
    return text;
  } catch (error) {
    console.error(`❌ ファイル読み取りエラー (${filePath}):`, error);
    return null;
  }
}

// メタデータの抽出
function extractMetadata(content, fileName) {
  const metadata = {
    has_tables: false,
    has_images: false,
    table_count: 0,
    image_count: 0,
    metrics: {}
  };

  if (!content) return metadata;

  // テーブルの検出
  const tableMatches = content.match(/\|.*\|.*\|/g) || [];
  metadata.has_tables = tableMatches.length > 0;
  metadata.table_count = tableMatches.length;

  // 画像の検出
  const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
  metadata.has_images = imageMatches.length > 0;
  metadata.image_count = imageMatches.length;

  // 財務指標の抽出
  const patterns = {
    sales: /売上高[：\s]*([0-9,]+)/,
    profit: /営業利益[：\s]*([0-9,]+)/,
    net_income: /当期純利益[：\s]*([0-9,]+)/,
    total_assets: /総資産[：\s]*([0-9,]+)/,
    equity: /純資産[：\s]*([0-9,]+)/,
    employees: /従業員数[：\s]*([0-9,]+)/
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      metadata.metrics[key] = match[1].replace(/,/g, '');
    }
  }

  return metadata;
}

// メインの処理関数
async function populateMarkdownMetadata() {
  console.log('🚀 Markdown メタデータの投入を開始します...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  try {
    // まず既存のデータをクリア（オプション）
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🗑️ 既存データをクリアしています...');
      const { error: deleteError } = await supabase
        .from('markdown_files_metadata')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 全削除
      
      if (deleteError) {
        console.error('❌ データクリアエラー:', deleteError);
        return;
      }
    }

    // 年度フォルダをスキャン
    const years = ['FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024'];
    let totalFiles = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const year of years) {
      console.log(`\n📅 ${year} をスキャン中...`);
      
      // 年度フォルダ内の企業フォルダを取得
      const companies = await listStorageFiles(year);
      
      for (const company of companies) {
        if (company.name && !company.name.includes('.')) {
          const companyPath = `${year}/${company.name}`;
          console.log(`  🏢 ${company.name} を処理中...`);
          
          // PublicDoc_markdown フォルダをチェック
          const markdownFolder = `${companyPath}/PublicDoc_markdown`;
          const files = await listStorageFiles(markdownFolder);
          
          for (const file of files) {
            if (file.name && file.name.endsWith('.md')) {
              totalFiles++;
              const filePath = `${markdownFolder}/${file.name}`;
              
              // ファイル内容を取得
              const content = await getFileContent(filePath);
              const contentPreview = content ? content.substring(0, 1000) : '';
              
              // ドキュメントタイプを判定
              let docType = 'その他';
              for (const [key, value] of Object.entries(documentTypeMap)) {
                if (file.name.includes(key)) {
                  docType = value;
                  break;
                }
              }
              
              // メタデータを抽出
              const metadata = extractMetadata(content, file.name);
              
              // レコードを作成
              const record = {
                company_id: company.name,
                company_name: company.name, // 後で企業マスタから取得する
                fiscal_year: year.replace('FY', ''),
                file_name: file.name,
                file_path: filePath,
                storage_path: filePath,
                document_type: docType,
                section_type: getSectionType(file.name),
                file_size: file.metadata?.size || estimateFileSize(content),
                content_preview: contentPreview,
                content_hash: null, // 必要に応じて実装
                has_tables: metadata.has_tables,
                has_images: metadata.has_images,
                metadata: metadata,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // データベースに挿入
              const { error: insertError } = await supabase
                .from('markdown_files_metadata')
                .insert(record);
              
              if (insertError) {
                console.error(`    ❌ 挿入エラー (${file.name}):`, insertError.message);
                errorCount++;
              } else {
                console.log(`    ✅ ${file.name}`);
                successCount++;
              }
              
              // レート制限対策
              if (totalFiles % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 処理完了サマリー:');
    console.log(`  総ファイル数: ${totalFiles}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${errorCount}`);
    
    // 企業名を companiesテーブルから更新
    console.log('\n🔄 企業名を更新中...');
    const { data: companies } = await supabase
      .from('companies')
      .select('company_id, company_name');
    
    if (companies) {
      for (const company of companies) {
        const { error: updateError } = await supabase
          .from('markdown_files_metadata')
          .update({ company_name: company.company_name })
          .eq('company_id', company.company_id);
        
        if (updateError) {
          console.error(`❌ 企業名更新エラー (${company.company_id}):`, updateError.message);
        }
      }
      console.log('✅ 企業名の更新完了');
    }
    
    // 統計情報を表示
    const { data: stats } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year, document_type')
      .order('fiscal_year', { ascending: false });
    
    if (stats) {
      const yearStats = {};
      const docTypeStats = {};
      
      stats.forEach(row => {
        yearStats[row.fiscal_year] = (yearStats[row.fiscal_year] || 0) + 1;
        docTypeStats[row.document_type] = (docTypeStats[row.document_type] || 0) + 1;
      });
      
      console.log('\n📈 年度別ファイル数:');
      Object.entries(yearStats).sort().forEach(([year, count]) => {
        console.log(`  ${year}年: ${count}件`);
      });
      
      console.log('\n📑 ドキュメントタイプ別:');
      Object.entries(docTypeStats).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}件`);
      });
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

// 実行
if (require.main === module) {
  console.log('================================');
  console.log('Markdown メタデータ投入スクリプト');
  console.log('================================');
  console.log('使用方法:');
  console.log('  node populate-markdown-metadata.js [--clear]');
  console.log('  --clear: 既存データをクリアしてから投入');
  console.log('================================\n');
  
  populateMarkdownMetadata()
    .then(() => {
      console.log('\n✅ スクリプト完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { populateMarkdownMetadata };