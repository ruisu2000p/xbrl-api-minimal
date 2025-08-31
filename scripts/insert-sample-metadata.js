/**
 * サンプルMarkdownメタデータを手動投入
 * Storage接続問題の回避用
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('📝 サンプルメタデータ投入開始');
console.log(`📡 接続先: ${SUPABASE_URL}`);

// サンプルデータ（既存のINSERT文から抽出）
const sampleData = [
  {
    company_id: 'S100NS9Y',
    company_name: 'フルサト・マルカホールディングス株式会社',
    file_name: '0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
    file_path: 'S100NS9Y/PublicDoc/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
    storage_path: 'markdown-files/S100NS9Y/PublicDoc/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
    fiscal_year: 2021,
    document_type: 'PublicDoc',
    section_type: 'header',
    file_order: 0,
    file_size: 2048,
    content_preview: `# 【表紙】

【提出書類】 |  有価証券報告書
---|---
【根拠条文】 |  金融商品取引法第24条第１項
【提出先】 |  関東財務局長
【提出日】 |  2022年３月30日
【事業年度】 |  第１期（自 2021年10月１日 至 2021年12月31日）
【会社名】 |  フルサト・マルカホールディングス株式会社
【英訳名】 |  MARUKA FURUSATO Corporation
【代表者の役職氏名】 |  代表取締役社長 古里 龍平`,
    has_tables: true,
    has_images: false
  },
  {
    company_id: 'S100L3K4',
    company_name: '株式会社タカショー',
    file_name: '0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
    file_path: 'S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
    storage_path: 'markdown-files/S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
    fiscal_year: 2021,
    document_type: 'PublicDoc',
    section_type: 'company_overview',
    file_order: 101010,
    file_size: 15000,
    content_preview: `# 第一部【企業情報】

## 第１【企業の概況】

### １【主要な経営指標等の推移】

当社は、エクステリア・ガーデニング用品の企画・製造・販売を主力事業として展開しております。当社グループは、当社及び連結子会社２社により構成されており、エクステリア・ガーデニング用品の企画・製造・販売事業を営んでおります。

#### 連結経営指標等

| 決算年月 | 2017年１月 | 2018年１月 | 2019年１月 | 2020年１月 | 2021年１月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（千円） | 7,244,588 | 7,899,652 | 8,156,983 | 8,440,125 | 8,789,456 |`,
    has_tables: true,
    has_images: false
  },
  {
    company_id: 'S100LJ4F',
    company_name: '亀田製菓株式会社',
    file_name: '0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
    file_path: 'S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
    storage_path: 'markdown-files/S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
    fiscal_year: 2021,
    document_type: 'PublicDoc',
    section_type: 'business_overview',
    file_order: 102010,
    file_size: 22000,
    content_preview: `## 第１【企業の概況】

### ２【事業の状況】

#### (1) 経営方針、経営環境及び対処すべき課題等

当社グループは、「美味しさ、楽しさ、健康を」をモットーに、米菓を中心とした菓子事業を展開しております。

当社グループの主力商品である米菓は、お米を主原料とした日本の伝統的な菓子であり、健康志向の高まりとともに、その価値が再認識されております。

#### (2) 事業等のリスク

| リスク項目 | 内容 | 対策 |
|----------|------|------|
| 原材料価格の変動 | 米価格の変動 | 調達先の多様化 |`,
    has_tables: true,
    has_images: false
  },
  {
    company_id: 'S100A123',
    company_name: '株式会社サンプル',
    file_name: '0103010_honbun_sample_2020.md',
    file_path: 'S100A123/PublicDoc_markdown/0103010_honbun_sample_2020.md',
    storage_path: 'markdown-files/S100A123/PublicDoc_markdown/0103010_honbun_sample_2020.md',
    fiscal_year: 2020,
    document_type: 'PublicDoc',
    section_type: 'business_risks',
    file_order: 103010,
    file_size: 8500,
    content_preview: `### ３【事業等のリスク】

当社グループの事業展開において、投資者の判断に重要な影響を及ぼす可能性があると考えられる主要なリスクは以下のとおりです。

#### (1) 市場環境の変化

消費者の嗜好の変化や競合他社との競争激化により、当社製品の売上が減少する可能性があります。

#### (2) 原材料価格の変動

主要原材料の価格上昇が、当社の業績に影響を与える可能性があります。`,
    has_tables: false,
    has_images: false
  },
  {
    company_id: 'S100B456',
    company_name: '株式会社テスト',
    file_name: '0104010_honbun_test_2022.md',
    file_path: 'S100B456/AuditDoc_markdown/0104010_honbun_test_2022.md',
    storage_path: 'markdown-files/S100B456/AuditDoc_markdown/0104010_honbun_test_2022.md',
    fiscal_year: 2022,
    document_type: 'AuditDoc',
    section_type: 'management_analysis',
    file_order: 104010,
    file_size: 12000,
    content_preview: `### ４【経営者による財政状態、経営成績及びキャッシュ・フローの状況の分析】

#### (1) 経営成績等の状況の概要

当連結会計年度の業績は以下のとおりです。

| 項目 | 金額（千円） | 前年同期比 |
|------|-------------|----------|
| 売上高 | 1,500,000 | +5.2% |
| 営業利益 | 150,000 | +8.1% |
| 経常利益 | 145,000 | +7.8% |
| 当期純利益 | 98,000 | +12.3% |

![業績推移グラフ](images/performance_graph.png)`,
    has_tables: true,
    has_images: true
  }
];

async function insertSampleData() {
  try {
    console.log('\n📝 サンプルデータを投入中...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sampleData.length; i++) {
      const data = sampleData[i];
      
      console.log(`[${i + 1}/${sampleData.length}] ${data.company_name} - ${data.section_type}`);
      
      const { error } = await supabase
        .from('markdown_files_metadata')
        .upsert({
          ...data,
          indexed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'file_path',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`  ❌ エラー: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ 成功`);
        successCount++;
      }
    }
    
    console.log('\n========================================');
    console.log('📊 投入結果');
    console.log('========================================');
    console.log(`✅ 成功: ${successCount}件`);
    if (errorCount > 0) {
      console.log(`❌ エラー: ${errorCount}件`);
    }
    
    // 統計情報表示
    const { count } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📈 総レコード数: ${count}`);
    
    // サンプルクエリテスト
    const { data: samples } = await supabase
      .from('markdown_files_metadata')
      .select('company_name, section_type, fiscal_year, file_size')
      .limit(3);
    
    if (samples && samples.length > 0) {
      console.log('\n📋 投入されたサンプル:');
      samples.forEach(sample => {
        console.log(`  - ${sample.company_name} (${sample.fiscal_year}年) - ${sample.section_type} (${(sample.file_size / 1024).toFixed(1)}KB)`);
      });
    }
    
  } catch (error) {
    console.error('❌ 処理エラー:', error.message);
    process.exit(1);
  }
}

// メイン実行
if (require.main === module) {
  insertSampleData().catch(error => {
    console.error('❌ 実行エラー:', error.message);
    process.exit(1);
  });
}

module.exports = { insertSampleData };