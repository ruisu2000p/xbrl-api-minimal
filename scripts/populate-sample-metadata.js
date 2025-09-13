/**
 * サンプルデータをmarkdown_files_metadataテーブルに投入するスクリプト
 * Service Role Keyが不要なバージョン（テスト用）
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

// サンプル企業データ
const sampleCompanies = [
  { id: 'S100LJ4F', name: '亀田製菓株式会社' },
  { id: 'S100KLVZ', name: 'クスリのアオキホールディングス' },
  { id: 'S100KM6Z', name: '石原産業株式会社' },
  { id: 'S100KLL1', name: 'ロート製薬株式会社' },
  { id: 'S100JNB2', name: 'セイコーホールディングス株式会社' }
];

// ドキュメントタイプ
const documentTypes = [
  { code: '0101010', name: '企業の概況', section: 'company_overview' },
  { code: '0102010', name: '事業の状況', section: 'business_status' },
  { code: '0103010', name: '設備の状況', section: 'facilities' },
  { code: '0104010', name: '提出会社の状況', section: 'company_status' },
  { code: '0105010', name: '経理の状況', section: 'accounting' },
  { code: '0106010', name: 'コーポレート・ガバナンスの状況等', section: 'governance' },
  { code: '0201010', name: '連結財務諸表等', section: 'consolidated_fs' },
  { code: '0202010', name: '財務諸表等', section: 'financial_statements' }
];

// サンプルコンテンツを生成
function generateSampleContent(companyName, docType, year) {
  const contents = {
    '企業の概況': `# 第1【企業の概況】

## 1【主要な経営指標等の推移】

### (1) 連結経営指標等

| 回次 | 第${year-2}期 | 第${year-1}期 | 第${year}期 |
|------|------------|------------|------------|
| 売上高（百万円） | ${100000 + Math.floor(Math.random() * 50000)} | ${110000 + Math.floor(Math.random() * 50000)} | ${120000 + Math.floor(Math.random() * 50000)} |
| 経常利益（百万円） | ${5000 + Math.floor(Math.random() * 5000)} | ${6000 + Math.floor(Math.random() * 5000)} | ${7000 + Math.floor(Math.random() * 5000)} |
| 当期純利益（百万円） | ${3000 + Math.floor(Math.random() * 3000)} | ${3500 + Math.floor(Math.random() * 3000)} | ${4000 + Math.floor(Math.random() * 3000)} |
| 純資産額（百万円） | ${50000 + Math.floor(Math.random() * 30000)} | ${55000 + Math.floor(Math.random() * 30000)} | ${60000 + Math.floor(Math.random() * 30000)} |
| 総資産額（百万円） | ${100000 + Math.floor(Math.random() * 50000)} | ${110000 + Math.floor(Math.random() * 50000)} | ${120000 + Math.floor(Math.random() * 50000)} |
| 従業員数（人） | ${1000 + Math.floor(Math.random() * 2000)} | ${1100 + Math.floor(Math.random() * 2000)} | ${1200 + Math.floor(Math.random() * 2000)} |

## 2【沿革】

${companyName}は、昭和XX年に創業し、以来、着実な成長を続けています。

## 3【事業の内容】

当社グループは、${companyName}及び子会社XX社、関連会社XX社により構成されており...`,

    '事業の状況': `# 第2【事業の状況】

## 1【経営方針、経営環境及び対処すべき課題等】

### (1) 経営方針

当社グループは、「顧客第一主義」を経営理念として掲げ、高品質な製品・サービスの提供を通じて社会に貢献することを目指しています。

### (2) 経営環境

${year}年度の日本経済は、新型コロナウイルス感染症の影響が続く中、緩やかな回復基調で推移しました。

### (3) 対処すべき課題

- デジタルトランスフォーメーションの推進
- サステナビリティへの取り組み強化
- グローバル展開の加速
- 人材育成と働き方改革

## 2【事業等のリスク】

以下において、当社グループの事業展開上のリスク要因となる可能性があると考えられる主な事項を記載しています。

1. 市場環境の変化
2. 原材料価格の高騰
3. 為替レートの変動
4. 自然災害等の発生`,

    '経理の状況': `# 第5【経理の状況】

## 1【連結財務諸表等】

### (1) 連結貸借対照表

| 科目 | 当連結会計年度 | 前連結会計年度 |
|------|---------------|---------------|
| **資産の部** | | |
| 流動資産 | | |
| 　現金及び預金 | ${20000 + Math.floor(Math.random() * 10000)} | ${18000 + Math.floor(Math.random() * 10000)} |
| 　受取手形及び売掛金 | ${15000 + Math.floor(Math.random() * 8000)} | ${14000 + Math.floor(Math.random() * 8000)} |
| 　棚卸資産 | ${10000 + Math.floor(Math.random() * 5000)} | ${9000 + Math.floor(Math.random() * 5000)} |
| 固定資産 | | |
| 　有形固定資産 | ${30000 + Math.floor(Math.random() * 15000)} | ${28000 + Math.floor(Math.random() * 15000)} |
| 　無形固定資産 | ${5000 + Math.floor(Math.random() * 3000)} | ${4500 + Math.floor(Math.random() * 3000)} |

### (2) 連結損益計算書

売上高：${120000 + Math.floor(Math.random() * 50000)}百万円
営業利益：${8000 + Math.floor(Math.random() * 5000)}百万円
経常利益：${7500 + Math.floor(Math.random() * 5000)}百万円
当期純利益：${5000 + Math.floor(Math.random() * 3000)}百万円`
  };

  return contents[docType] || `# ${docType}\n\n${companyName}の${year}年度${docType}に関する情報です。\n\n詳細な内容はここに記載されます。`;
}

// メインの処理関数
async function populateSampleData() {
  console.log('🚀 サンプルデータの投入を開始します...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  try {
    // 既存のサンプルデータをクリア
    console.log('🗑️ 既存のサンプルデータをクリアしています...');
    const { error: deleteError } = await supabase
      .from('markdown_files_metadata')
      .delete()
      .ilike('company_id', 'S100%');
    
    if (deleteError) {
      console.log('⚠️ クリアエラー（無視可）:', deleteError.message);
    }

    let totalRecords = 0;
    let successCount = 0;
    let errorCount = 0;
    const years = ['2019', '2020', '2021', '2022', '2023'];

    for (const company of sampleCompanies) {
      console.log(`\n🏢 ${company.name} のデータを作成中...`);
      
      for (const year of years) {
        for (const docType of documentTypes) {
          totalRecords++;
          
          const content = generateSampleContent(company.name, docType.name, parseInt(year));
          const fileName = `${docType.code}_honbun_jpcrp040300-q3r-001_${company.id}_${year}-12-31.md`;
          const filePath = `FY${year}/${company.id}/PublicDoc_markdown/${fileName}`;
          
          // メタデータを作成
          const metadata = {
            has_tables: content.includes('|'),
            has_images: false,
            table_count: (content.match(/\|.*\|.*\|/g) || []).length,
            image_count: 0,
            metrics: {
              sales: content.match(/売上高[：\s]*([0-9,]+)/) ? content.match(/売上高[：\s]*([0-9,]+)/)[1] : null,
              profit: content.match(/営業利益[：\s]*([0-9,]+)/) ? content.match(/営業利益[：\s]*([0-9,]+)/)[1] : null,
              net_income: content.match(/当期純利益[：\s]*([0-9,]+)/) ? content.match(/当期純利益[：\s]*([0-9,]+)/)[1] : null
            }
          };
          
          const record = {
            company_id: company.id,
            company_name: company.name,
            ticker_code: null,  // サンプルデータなのでnull
            fiscal_year: year,
            file_name: fileName,
            file_type: 'markdown',
            file_size: Buffer.byteLength(content, 'utf8'),
            storage_bucket: 'markdown-files',
            storage_path: filePath,
            sector: null,  // サンプルデータなのでnull
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // データベースに挿入
          const { error: insertError } = await supabase
            .from('markdown_files_metadata')
            .insert(record);
          
          if (insertError) {
            console.error(`  ❌ エラー (${fileName}):`, insertError.message);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }
      
      console.log(`  ✅ ${company.name}: ${years.length * documentTypes.length}件作成`);
    }
    
    console.log('\n📊 処理完了サマリー:');
    console.log(`  総レコード数: ${totalRecords}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${errorCount}`);
    
    // 統計情報を取得
    const { data: stats, error: statsError } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year, file_type, company_name')
      .order('fiscal_year', { ascending: false });
    
    if (stats && !statsError) {
      const yearStats = {};
      const companyStats = {};
      const fileTypeStats = {};
      
      stats.forEach(row => {
        yearStats[row.fiscal_year] = (yearStats[row.fiscal_year] || 0) + 1;
        companyStats[row.company_name] = (companyStats[row.company_name] || 0) + 1;
        fileTypeStats[row.file_type] = (fileTypeStats[row.file_type] || 0) + 1;
      });
      
      console.log('\n📈 統計情報:');
      console.log('\n年度別:');
      Object.entries(yearStats).sort().forEach(([year, count]) => {
        console.log(`  ${year}年: ${count}件`);
      });
      
      console.log('\n企業別:');
      Object.entries(companyStats).forEach(([company, count]) => {
        console.log(`  ${company}: ${count}件`);
      });
      
      console.log('\nファイルタイプ別:');
      Object.entries(fileTypeStats).forEach(([type, count]) => {
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
  console.log('サンプルメタデータ投入スクリプト');
  console.log('================================\n');
  
  populateSampleData()
    .then(() => {
      console.log('\n✅ スクリプト完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { populateSampleData };