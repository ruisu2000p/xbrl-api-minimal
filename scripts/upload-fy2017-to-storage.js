/**
 * FY2017データ（2016年4月1日〜2017年3月31日）をSupabase Storageにアップロード
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FY2017データのベースパス
const FY2017_BASE_PATH = 'C:\\Users\\pumpk\\OneDrive\\デスクトップ\\アプリ開発\\xbrl\\download_xbrl\\2016_4_1から2017_3_31\\all_markdown_2016_2017_new';

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

// 企業IDを抽出（フォルダ名から）
function extractCompanyId(folderName) {
  // フォルダ名の形式: S10075EH_企業名_有価証券報告書−第88期(2015_04_01−2016_03_31)
  const match = folderName.match(/^([A-Z0-9]+)_/);
  return match ? match[1] : folderName;
}

// 企業名を抽出（フォルダ名から）
function extractCompanyName(folderName) {
  // フォルダ名の形式: S10075EH_企業名_有価証券報告書−第88期(2015_04_01−2016_03_31)
  const parts = folderName.split('_');
  if (parts.length >= 2) {
    return parts[1];
  }
  return folderName;
}

// ファイルをアップロード
async function uploadFile(localPath, storagePath) {
  try {
    const fileContent = await fs.readFile(localPath);
    
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .upload(storagePath, fileContent, {
        contentType: 'text/markdown',
        upsert: true
      });
    
    if (error) {
      console.error(`Upload error for ${storagePath}:`, error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error(`File read error for ${localPath}:`, err.message);
    return false;
  }
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

// 1社分のデータをアップロード
async function uploadCompanyData(companyFolder) {
  const companyId = extractCompanyId(companyFolder);
  const companyName = extractCompanyName(companyFolder);
  const localCompanyPath = path.join(FY2017_BASE_PATH, companyFolder);
  
  // 直接企業フォルダ内のMarkdownファイルを探す（FY2017形式）
  let publicDocPath = localCompanyPath;
  let markdownFiles = [];
  
  try {
    // 企業フォルダ直下のファイルを取得
    const files = await fs.readdir(localCompanyPath);
    markdownFiles = files.filter(f => f.endsWith('.md'));
    
    // Markdownファイルがない場合、PublicDoc_markdownフォルダを確認
    if (markdownFiles.length === 0) {
      const publicDocSubPath = path.join(localCompanyPath, 'PublicDoc_markdown');
      if (fsSync.existsSync(publicDocSubPath)) {
        publicDocPath = publicDocSubPath;
        const subFiles = await fs.readdir(publicDocSubPath);
        markdownFiles = subFiles.filter(f => f.endsWith('.md'));
      }
    }
  } catch (err) {
    console.log(`⚠️ Error reading folder for ${companyName} (${companyId}): ${err.message}`);
    return false;
  }
  
  if (markdownFiles.length === 0) {
    console.log(`⚠️ No markdown files for ${companyName} (${companyId})`);
    return false;
  }
  
  let uploadedCount = 0;
  let metrics = {};
  
  // 各ファイルをアップロード
  for (const file of markdownFiles) {
    const localFilePath = path.join(publicDocPath, file);
    // ストレージパスは統一形式（PublicDoc）を使用
    const storageFilePath = `FY2017/${companyId}/PublicDoc/${file}`;
    
    const success = await uploadFile(localFilePath, storageFilePath);
    if (success) {
      uploadedCount++;
      
      // 企業概況ファイルから財務データを抽出
      if (file.includes('0101010')) {
        const content = await fs.readFile(localFilePath, 'utf-8');
        metrics = extractFinancialMetrics(content);
      }
    }
  }
  
  // メタデータを更新
  if (uploadedCount > 0) {
    const storagePath = `FY2017/${companyId}/PublicDoc`;
    await updateMetadata(
      companyId,
      companyName,
      'FY2017',
      storagePath,
      uploadedCount,
      metrics
    );
    
    console.log(`✅ ${companyName} (${companyId}): ${uploadedCount}/${markdownFiles.length} files uploaded`);
    return true;
  }
  
  return false;
}

// メイン処理
async function main() {
  console.log('=== FY2017データ Supabase Storage アップロード ===\n');
  console.log('ソース:', FY2017_BASE_PATH);
  console.log('アップロード先: Supabase Storage (markdown-files/FY2017/)');
  console.log('');
  
  try {
    // 企業フォルダのリストを取得
    const companyFolders = await fs.readdir(FY2017_BASE_PATH);
    const totalCompanies = companyFolders.length;
    
    console.log(`総企業数: ${totalCompanies}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // バッチ処理（10社ずつ）
    const batchSize = 10;
    for (let i = 0; i < totalCompanies; i += batchSize) {
      const batch = companyFolders.slice(i, Math.min(i + batchSize, totalCompanies));
      
      console.log(`\n処理中: ${i + 1}-${Math.min(i + batchSize, totalCompanies)} / ${totalCompanies}`);
      
      // バッチ内の企業を並列処理
      const results = await Promise.all(
        batch.map(folder => uploadCompanyData(folder))
      );
      
      // 結果をカウント
      results.forEach(success => {
        if (success) successCount++;
        else errorCount++;
      });
      
      // レート制限対策（1秒待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 統計情報を表示
    console.log('\n=== アップロード完了 ===');
    console.log(`成功: ${successCount}社`);
    console.log(`エラー: ${errorCount}社`);
    console.log(`合計: ${totalCompanies}社`);
    
    // メタデータテーブルの統計を確認
    const { data: stats, error } = await supabase
      .from('storage_metadata')
      .select('fiscal_year, count', { count: 'exact' })
      .eq('fiscal_year', 'FY2017');
    
    if (!error && stats) {
      console.log(`\nFY2017メタデータ登録数: ${stats.length}件`);
    }
    
    console.log('\n✅ FY2017データのアップロードが完了しました！');
    console.log('Supabase Storageでデータを確認してください。');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadCompanyData, extractCompanyId, extractCompanyName };