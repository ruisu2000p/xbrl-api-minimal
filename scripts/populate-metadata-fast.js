/**
 * 高速版：既知の企業のメタデータを投入
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 既知の企業と年度の組み合わせ
const knownData = [
  { year: 'FY2024', companies: ['S100KLVZ', 'S100KSGF', 'S100KY0O', 'S100L3K4', 'S100L5HA'] },
  { year: 'FY2023', companies: [] }, // 後で追加
  { year: 'FY2022', companies: [] },
  { year: 'FY2021', companies: [] },
  { year: 'FY2020', companies: [] },
];

// ドキュメントタイプのマッピング
const docTypes = [
  { code: '0101010', name: '企業の概況' },
  { code: '0102010', name: '事業の状況' },
  { code: '0103010', name: '設備の状況' },
  { code: '0104010', name: '提出会社の状況' },
  { code: '0105010', name: '経理の状況' },
  { code: '0106010', name: 'コーポレート・ガバナンスの状況等' },
  { code: '0201010', name: '連結財務諸表等' },
  { code: '0202010', name: '財務諸表等' }
];

async function populateMetadataFast() {
  console.log('🚀 メタデータ投入を開始します...\n');
  
  try {
    // 既存のメタデータをクリア
    console.log('🗑️ 既存のメタデータをクリア中...');
    await supabase
      .from('markdown_files_metadata')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 存在しないIDで全削除
    
    let totalRecords = 0;
    let successCount = 0;
    
    // 各年度のフォルダをチェック
    for (const yearData of knownData) {
      console.log(`\n📅 ${yearData.year}を処理中...`);
      
      // 年度フォルダ内の企業リストを取得
      const { data: companiesInYear, error: listError } = await supabase.storage
        .from('markdown-files')
        .list(yearData.year, { limit: 100 });
      
      if (listError || !companiesInYear) {
        console.log(`  ⚠️ ${yearData.year}のデータ取得をスキップ`);
        continue;
      }
      
      const companyIds = companiesInYear.map(c => c.name);
      console.log(`  📁 ${companyIds.length}社が見つかりました`);
      
      // 各企業のメタデータを生成
      for (const companyId of companyIds.slice(0, 10)) { // 最初の10社のみ処理
        const docPath = `${yearData.year}/${companyId}/PublicDoc_markdown`;
        
        // ファイルリストを取得
        const { data: files, error: filesError } = await supabase.storage
          .from('markdown-files')
          .list(docPath, { limit: 20 });
        
        if (filesError || !files || files.length === 0) {
          continue;
        }
        
        // companiesテーブルから企業情報を取得
        const { data: companyInfo } = await supabase
          .from('companies')
          .select('company_name, ticker_code, sector')
          .eq('id', companyId)
          .single();
        
        const companyName = companyInfo?.company_name || `企業_${companyId}`;
        const tickerCode = companyInfo?.ticker_code || null;
        const sector = companyInfo?.sector || 'その他';
        
        // メタデータレコードを作成
        const metadataRecords = files.map(file => {
          const docTypeCode = file.name.substring(0, 7);
          const docType = docTypes.find(d => d.code === docTypeCode);
          
          return {
            company_id: companyId,
            company_name: companyName,
            ticker_code: tickerCode,
            fiscal_year: yearData.year.replace('FY', ''),
            file_name: file.name,
            file_type: 'markdown',
            file_size: file.metadata?.size || 0,
            storage_bucket: 'markdown-files',
            storage_path: `${docPath}/${file.name}`,
            sector: sector,
            document_type: docType?.name || 'その他',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });
        
        // バッチで挿入
        const { error: insertError } = await supabase
          .from('markdown_files_metadata')
          .insert(metadataRecords);
        
        if (insertError) {
          console.log(`  ❌ ${companyId}: ${insertError.message}`);
        } else {
          successCount += metadataRecords.length;
          console.log(`  ✅ ${companyId}: ${metadataRecords.length}件追加`);
        }
        
        totalRecords += metadataRecords.length;
      }
    }
    
    // 統計情報を表示
    console.log('\n' + '='.repeat(60));
    console.log('📊 投入完了サマリー:');
    console.log('='.repeat(60));
    console.log(`  総レコード数: ${totalRecords}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${totalRecords - successCount}`);
    
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
    
    // サンプルデータを表示
    const { data: samples } = await supabase
      .from('markdown_files_metadata')
      .select('company_name, fiscal_year, document_type')
      .limit(5);
    
    if (samples) {
      console.log('\n📝 サンプルデータ:');
      samples.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.company_name} (FY${s.fiscal_year}) - ${s.document_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
populateMetadataFast()
  .then(() => {
    console.log('\n✅ 完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
  });