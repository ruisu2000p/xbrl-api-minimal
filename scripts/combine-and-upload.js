require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 処理範囲の設定
const START_INDEX = parseInt(process.env.START_INDEX || '0');
const END_INDEX = parseInt(process.env.END_INDEX || '10'); // まず10社でテスト
const BATCH_SIZE = 5;

// カウンター
let processedCount = 0;
let errorCount = 0;
const errors = [];

async function main() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('XBRL Markdown 結合アップロードスクリプト');
  console.log('===========================================');
  console.log('ソースディレクトリ:', baseDir);
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');
  
  try {
    const companies = await fs.readdir(baseDir);
    const targetCompanies = companies.slice(START_INDEX, Math.min(END_INDEX, companies.length));
    
    console.log(`📁 ${companies.length}社のデータを検出しました`);
    console.log(`処理範囲: ${START_INDEX + 1}社目 〜 ${Math.min(END_INDEX, companies.length)}社目`);
    console.log('');
    
    // バッチ処理
    for (let i = 0; i < targetCompanies.length; i += BATCH_SIZE) {
      const batch = targetCompanies.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`バッチ ${batchNum}: ${START_INDEX + i + 1}〜${START_INDEX + i + batch.length}社目を処理中...`);
      
      await Promise.all(
        batch.map(companyDir => processCompany(companyDir, baseDir))
      );
      
      console.log(`✅ 進捗: ${processedCount}社/${targetCompanies.length}社完了, エラー: ${errorCount}件`);
    }
    
    // 完了レポート
    console.log('');
    console.log('===========================================');
    console.log('アップロード完了');
    console.log('===========================================');
    console.log(`✅ 成功: ${processedCount}社`);
    console.log(`❌ エラー: ${errorCount}社`);
    
    if (errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach(err => {
        console.log(`  - ${err.company}: ${err.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error.message);
    console.error(error.stack);
  }
}

async function processCompany(companyDir, baseDir) {
  const companyPath = path.join(baseDir, companyDir);
  
  try {
    const stats = await fs.stat(companyPath);
    
    if (!stats.isDirectory()) {
      return;
    }
    
    // ディレクトリ名から企業IDを抽出
    const companyIdMatch = companyDir.match(/^([A-Z0-9]+)/i);
    const companyId = companyIdMatch ? companyIdMatch[1] : companyDir.replace(/[^A-Za-z0-9]/g, '_');
    
    // PublicDoc_markdownディレクトリを探す
    const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
    let docPath = publicDocPath;
    let docType = 'public';
    
    try {
      await fs.access(publicDocPath);
    } catch {
      // PublicDocがない場合はAuditDocを試す
      const auditDocPath = path.join(companyPath, 'AuditDoc_markdown');
      try {
        await fs.access(auditDocPath);
        docPath = auditDocPath;
        docType = 'audit';
      } catch {
        throw new Error('Markdownディレクトリが見つかりません');
      }
    }
    
    // すべてのMarkdownファイルを結合
    await combineAndUploadMarkdownFiles(companyId, docPath, docType, companyDir);
    
    processedCount++;
    
  } catch (error) {
    errorCount++;
    errors.push({
      company: companyDir,
      message: error.message
    });
  }
}

async function combineAndUploadMarkdownFiles(companyId, docPath, docType, originalDirName) {
  const files = await fs.readdir(docPath);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort(); // ファイル名順にソート
  
  if (mdFiles.length === 0) {
    throw new Error('Markdownファイルが見つかりません');
  }
  
  console.log(`  📂 ${originalDirName}: ${mdFiles.length}ファイルを結合中...`);
  
  // すべてのMarkdownファイルを結合
  let combinedContent = '';
  let companyInfo = null;
  let fiscalYear = null;
  
  for (const mdFile of mdFiles) {
    const content = await fs.readFile(
      path.join(docPath, mdFile),
      'utf-8'
    );
    
    // 最初のファイルから企業情報を抽出
    if (!companyInfo) {
      companyInfo = extractCompanyInfo(content, originalDirName);
      fiscalYear = extractFiscalYear(content);
    }
    
    // ファイル区切りを追加して結合
    combinedContent += `\n\n<!-- =============== ${mdFile} =============== -->\n\n`;
    combinedContent += content;
  }
  
  // 1. 企業マスタをデータベースに保存
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .upsert({
      id: companyId,
      ticker: companyInfo.ticker,
      name: companyInfo.name,
      sector: companyInfo.sector,
      market: companyInfo.market,
      description: originalDirName
    }, {
      onConflict: 'id'
    });
  
  if (companyError) {
    console.log(`  ⚠️ 企業マスタ保存エラー: ${companyError.message}`);
  }
  
  // 2. 結合したMarkdownをStorageにアップロード
  const fileName = `${fiscalYear}/${companyId}/combined_${docType}.md`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('markdown-files')
    .upload(fileName, combinedContent, {
      contentType: 'text/markdown; charset=utf-8',
      upsert: true
    });
  
  if (uploadError) {
    throw new Error(`アップロードエラー: ${uploadError.message}`);
  }
  
  // 3. データベースにレポート情報を保存
  const financialData = extractFinancialData(combinedContent);
  
  const { data: reportData, error: reportError } = await supabase
    .from('financial_reports')
    .upsert({
      company_id: companyId,
      fiscal_year: fiscalYear,
      fiscal_period: `${fiscalYear}年3月期`,
      markdown_content: combinedContent.substring(0, 10000), // 最初の10000文字
      financial_data: financialData,
      doc_type: docType,
      storage_path: fileName,
      metadata: {
        original_dir: originalDirName,
        file_count: mdFiles.length,
        files: mdFiles
      }
    }, {
      onConflict: 'company_id,fiscal_year,doc_type'
    });
  
  if (reportError) {
    throw new Error(`DB保存エラー: ${reportError.message}`);
  }
  
  console.log(`  ✅ ${mdFiles.length}ファイルを結合してアップロード完了`);
}

// 企業情報を抽出
function extractCompanyInfo(content, dirName) {
  const info = {
    name: 'Unknown Company',
    ticker: null,
    sector: null,
    market: null
  };
  
  // ディレクトリ名から企業名を抽出
  const nameMatch = dirName.match(/_([^_]+株式会社[^_]*)/);
  if (nameMatch) {
    info.name = nameMatch[1];
  }
  
  // 内容から証券コードを抽出
  const tickerMatch = content.match(/証券コード[：:]\s*(\d{4})/);
  if (tickerMatch) {
    info.ticker = tickerMatch[1];
  }
  
  // 業種を抽出
  const sectorMatch = content.match(/事業の種類[：:]\s*([^\n]+)/);
  if (sectorMatch) {
    info.sector = sectorMatch[1].trim();
  }
  
  return info;
}

// 年度を抽出
function extractFiscalYear(content) {
  const yearMatch = content.match(/令和(\d+)年|平成(\d+)年|(\d{4})年3月/);
  if (yearMatch) {
    if (yearMatch[1]) {
      return 2018 + parseInt(yearMatch[1]); // 令和
    } else if (yearMatch[2]) {
      return 1988 + parseInt(yearMatch[2]); // 平成
    } else if (yearMatch[3]) {
      return parseInt(yearMatch[3]);
    }
  }
  return '2022'; // デフォルト
}

// 財務データを抽出（簡易版）
function extractFinancialData(content) {
  const data = {};
  
  // 売上高を探す
  const revenueMatch = content.match(/売上高[：:]\s*([0-9,]+)/);
  if (revenueMatch) {
    data.revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
  }
  
  // 営業利益を探す
  const operatingIncomeMatch = content.match(/営業利益[：:]\s*([0-9,]+)/);
  if (operatingIncomeMatch) {
    data.operating_income = parseInt(operatingIncomeMatch[1].replace(/,/g, ''));
  }
  
  // 当期純利益を探す
  const netIncomeMatch = content.match(/当期純利益[：:]\s*([0-9,]+)/);
  if (netIncomeMatch) {
    data.net_income = parseInt(netIncomeMatch[1].replace(/,/g, ''));
  }
  
  return data;
}

// 実行
main();