/**
 * Supabase Storage内のすべてのMarkdownファイルをスキャンして投入
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

// ドキュメントタイプのマッピング
const docTypeMap = {
  '0101010': '企業の概況',
  '0102010': '事業の状況',
  '0103010': '設備の状況',
  '0104010': '提出会社の状況',
  '0105010': '経理の状況',
  '0106010': 'コーポレート・ガバナンスの状況等',
  '0107010': '監査の状況',
  '0201010': '連結財務諸表等',
  '0202010': '財務諸表等',
  '0203010': '最近の財務諸表',
  '0204010': '附属明細表',
  '0205010': '主な資産及び負債の内容',
  '0206010': '株式事務の概要',
  '0207010': '参考情報'
};

async function scanAllStorage() {
  console.log('🚀 完全スキャンを開始します...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log('='.repeat(70));
  
  try {
    // 既存のメタデータをクリア
    console.log('🗑️ 既存のメタデータをクリア中...');
    await supabase
      .from('markdown_files_metadata')
      .delete()
      .neq('company_id', ''); // すべて削除
    
    const availableYears = ['FY2015', 'FY2016', 'FY2017', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'];
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    
    // 各年度を処理
    for (const yearFolder of availableYears) {
      console.log(`\n📅 ${yearFolder}を処理中...`);
      
      // 年度フォルダ内の企業リストを取得（ページネーション対応）
      let offset = 0;
      let hasMore = true;
      let yearCompanies = [];
      
      while (hasMore) {
        const { data: companies, error } = await supabase.storage
          .from('markdown-files')
          .list(yearFolder, {
            limit: 100,
            offset: offset
          });
        
        if (error || !companies) {
          hasMore = false;
          break;
        }
        
        yearCompanies = yearCompanies.concat(companies);
        
        if (companies.length < 100) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }
      
      if (yearCompanies.length === 0) {
        console.log(`  ⚠️ ${yearFolder}にデータがありません`);
        continue;
      }
      
      console.log(`  📁 ${yearCompanies.length}社が見つかりました`);
      
      // バッチ処理（10社ずつ）
      const batchSize = 10;
      for (let i = 0; i < yearCompanies.length; i += batchSize) {
        const batch = yearCompanies.slice(i, i + batchSize);
        const metadataRecords = [];
        
        for (const companyFolder of batch) {
          const companyId = companyFolder.name;
          const docPath = `${yearFolder}/${companyId}/PublicDoc_markdown`;
          
          // ドキュメントファイルリストを取得
          const { data: files, error: filesError } = await supabase.storage
            .from('markdown-files')
            .list(docPath, {
              limit: 50
            });
          
          if (filesError || !files || files.length === 0) {
            continue;
          }
          
          // companiesテーブルから企業情報を取得
          const { data: companyInfo } = await supabase
            .from('companies')
            .select('company_name, ticker_code, sector')
            .eq('id', companyId)
            .single();
          
          const companyName = companyInfo?.company_name || `未登録企業_${companyId}`;
          const tickerCode = companyInfo?.ticker_code || null;
          const sector = companyInfo?.sector || 'その他';
          const fiscalYear = yearFolder.replace('FY', '');
          
          // 各ファイルのメタデータを作成
          for (const file of files) {
            // ファイル名から情報を抽出
            const fileName = file.name;
            const docTypeCode = fileName.substring(0, 7);
            const docTypeName = docTypeMap[docTypeCode] || 'その他文書';
            
            // 日付情報の抽出（ファイル名に含まれる場合）
            const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
            const fileDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
            
            metadataRecords.push({
              company_id: companyId,
              company_name: companyName,
              ticker_code: tickerCode,
              fiscal_year: fiscalYear,
              file_name: fileName,
              file_type: 'markdown',
              file_size: file.metadata?.size || 0,
              storage_bucket: 'markdown-files',
              storage_path: `${docPath}/${fileName}`,
              sector: sector,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
          
          totalProcessed += files.length;
        }
        
        // バッチ挿入
        if (metadataRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('markdown_files_metadata')
            .insert(metadataRecords);
          
          if (insertError) {
            console.log(`  ❌ バッチ ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
            totalErrors += metadataRecords.length;
          } else {
            totalInserted += metadataRecords.length;
            console.log(`  ✅ バッチ ${Math.floor(i/batchSize) + 1}: ${metadataRecords.length}件追加`);
          }
        }
        
        // 進捗表示
        if ((i + batchSize) % 100 === 0) {
          console.log(`  ⏳ 進捗: ${Math.min(i + batchSize, yearCompanies.length)}/${yearCompanies.length}社処理済み`);
        }
      }
    }
    
    // 最終統計
    console.log('\n' + '='.repeat(70));
    console.log('📊 スキャン完了サマリー:');
    console.log('='.repeat(70));
    console.log(`  処理ファイル数: ${totalProcessed.toLocaleString()}`);
    console.log(`  挿入成功: ${totalInserted.toLocaleString()}`);
    console.log(`  エラー: ${totalErrors.toLocaleString()}`);
    
    // データベース統計
    const { count } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📈 データベース内の総メタデータ数: ${count?.toLocaleString() || 0}件`);
    
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
      Object.entries(yearCounts).sort().forEach(([year, cnt]) => {
        const percentage = ((cnt / count) * 100).toFixed(1);
        console.log(`  FY${year}: ${cnt.toLocaleString()}件 (${percentage}%)`);
      });
    }
    
    // 企業数の統計
    const { data: uniqueCompanies } = await supabase
      .from('markdown_files_metadata')
      .select('company_id')
      .limit(50000);
    
    if (uniqueCompanies) {
      const uniqueIds = new Set(uniqueCompanies.map(c => c.company_id));
      console.log(`\n🏢 ユニーク企業数: ${uniqueIds.size.toLocaleString()}社`);
    }
    
    // セクター別統計
    const { data: sectorStats } = await supabase
      .from('markdown_files_metadata')
      .select('sector')
      .limit(50000);
    
    if (sectorStats) {
      const sectorCounts = {};
      sectorStats.forEach(row => {
        const sector = row.sector || '未分類';
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      });
      
      console.log('\n📊 セクター別ファイル数（上位10）:');
      Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([sector, cnt]) => {
          const percentage = ((cnt / count) * 100).toFixed(1);
          console.log(`  ${sector}: ${cnt.toLocaleString()}件 (${percentage}%)`);
        });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  scanAllStorage()
    .then(() => {
      console.log('\n✅ 完全スキャン完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { scanAllStorage };