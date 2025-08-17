/**
 * Supabase Storageのデータをスキャンして、storage_metadataテーブルを更新
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 財務データを抽出
function extractFinancialMetrics(content) {
  const metrics = {
    revenue: null,
    operating_income: null,
    net_income: null,
    total_assets: null,
    net_assets: null,
  };
  
  // 売上高
  const revenueMatch = content.match(/売上[高収益]*[^\d]*(\d{1,3}(?:,\d{3})*)/);
  if (revenueMatch) {
    metrics.revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
  }
  
  // 営業利益
  const operatingMatch = content.match(/営業利益[^\d]*(\d{1,3}(?:,\d{3})*)/);
  if (operatingMatch) {
    metrics.operating_income = parseInt(operatingMatch[1].replace(/,/g, ''));
  }
  
  // 当期純利益
  const netIncomeMatch = content.match(/親会社株主に帰属する[\s]*当期純利益[^\d]*(\d{1,3}(?:,\d{3})*)/);
  if (netIncomeMatch) {
    metrics.net_income = parseInt(netIncomeMatch[1].replace(/,/g, ''));
  }
  
  // 総資産
  const totalAssetsMatch = content.match(/総資産[額]*[^\d]*(\d{1,3}(?:,\d{3})*)/);
  if (totalAssetsMatch) {
    metrics.total_assets = parseInt(totalAssetsMatch[1].replace(/,/g, ''));
  }
  
  // 純資産
  const netAssetsMatch = content.match(/純資産[額]*[^\d]*(\d{1,3}(?:,\d{3})*)/);
  if (netAssetsMatch) {
    metrics.net_assets = parseInt(netAssetsMatch[1].replace(/,/g, ''));
  }
  
  return metrics;
}

// Storageからファイルリストを取得
async function listStorageFiles(prefix, limit = 1000) {
  const { data, error } = await supabase
    .storage
    .from('markdown-files')
    .list(prefix, { limit });
  
  if (error) {
    console.error('Storage list error:', error);
    return [];
  }
  
  return data || [];
}

// メタデータを更新
async function updateMetadata(companyId, companyName, fiscalYear, filePath, fileCount, metrics) {
  const { error } = await supabase.rpc('update_storage_metadata', {
    p_company_id: companyId,
    p_company_name: companyName,
    p_fiscal_year: fiscalYear,
    p_file_path: filePath,
    p_file_count: fileCount,
    p_revenue: metrics.revenue,
    p_operating_income: metrics.operating_income,
    p_net_income: metrics.net_income,
    p_total_assets: metrics.total_assets,
    p_net_assets: metrics.net_assets,
  });
  
  if (error) {
    console.error('Metadata update error:', error);
    return false;
  }
  
  return true;
}

// FY2021データをスキャン
async function scanFY2021Data() {
  console.log('\n=== FY2021データのスキャン開始 ===');
  
  // companiesテーブルから企業リストを取得
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1000);
  
  if (error) {
    console.error('Companies fetch error:', error);
    return;
  }
  
  let processedCount = 0;
  let successCount = 0;
  
  for (const company of companies) {
    const basePath = `${company.id}/PublicDoc_markdown`;
    const files = await listStorageFiles(basePath);
    
    if (files.length > 0) {
      // 企業概況ファイルを探す
      const overviewFile = files.find(f => f.name && f.name.includes('0101010'));
      let metrics = {};
      
      if (overviewFile) {
        // ファイル内容を取得して財務データを抽出
        const filePath = `${basePath}/${overviewFile.name}`;
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('markdown-files')
          .download(filePath);
        
        if (!downloadError && fileData) {
          const content = await fileData.text();
          metrics = extractFinancialMetrics(content);
        }
      }
      
      // メタデータを更新
      const success = await updateMetadata(
        company.id,
        company.name,
        'FY2021',
        basePath,
        files.length,
        metrics
      );
      
      if (success) {
        successCount++;
        console.log(`✓ ${company.name} (${company.id}): ${files.length}ファイル`);
      }
    }
    
    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`処理済み: ${processedCount}/${companies.length}`);
    }
  }
  
  console.log(`\nFY2021完了: ${successCount}社のデータを更新`);
}

// FY2016データをスキャン
async function scanFY2016Data() {
  console.log('\n=== FY2016データのスキャン開始 ===');
  
  const fy2016Companies = await listStorageFiles('FY2016');
  let successCount = 0;
  
  for (const companyFolder of fy2016Companies) {
    if (!companyFolder.name) continue;
    
    const companyId = companyFolder.name;
    const basePath = `FY2016/${companyId}/PublicDoc`;
    const files = await listStorageFiles(basePath);
    
    if (files.length > 0) {
      // 企業名を取得（companiesテーブルから）
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();
      
      const companyName = companyData?.name || companyId;
      
      // 企業概況ファイルを探す
      const overviewFile = files.find(f => f.name && f.name.includes('0101010'));
      let metrics = {};
      
      if (overviewFile) {
        const filePath = `${basePath}/${overviewFile.name}`;
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('markdown-files')
          .download(filePath);
        
        if (!downloadError && fileData) {
          const content = await fileData.text();
          metrics = extractFinancialMetrics(content);
        }
      }
      
      // メタデータを更新
      const success = await updateMetadata(
        companyId,
        companyName,
        'FY2016',
        basePath,
        files.length,
        metrics
      );
      
      if (success) {
        successCount++;
        console.log(`✓ ${companyName} (${companyId}): ${files.length}ファイル`);
      }
    }
  }
  
  console.log(`\nFY2016完了: ${successCount}社のデータを更新`);
}

// メイン処理
async function main() {
  console.log('=== Supabase Storage メタデータ同期 ===\n');
  console.log('接続先:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // FY2021データをスキャン
    await scanFY2021Data();
    
    // FY2016データをスキャン
    await scanFY2016Data();
    
    // 統計情報を表示
    const { data: stats } = await supabase
      .from('data_statistics')
      .select('*');
    
    console.log('\n=== 統計情報 ===');
    if (stats) {
      stats.forEach(stat => {
        console.log(`${stat.metric}: ${stat.value}`);
      });
    }
    
    console.log('\n✅ 同期完了！');
    console.log('Supabaseの管理画面で以下のビューを確認してください:');
    console.log('- company_data_overview: 企業データ概要');
    console.log('- financial_summary: 財務サマリー');
    console.log('- data_quality_check: データ品質チェック');
    console.log('- storage_paths: ストレージパス一覧');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
main();