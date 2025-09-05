require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 処理範囲の設定（デバッグ用に小さく設定可能）
const START_INDEX = parseInt(process.env.START_INDEX || '0');
const END_INDEX = parseInt(process.env.END_INDEX || '10'); // まず10社でテスト
const BATCH_SIZE = 5; // バッチサイズを小さく

// カウンター
let processedCount = 0;
let errorCount = 0;
let fileCount = 0;
const errors = [];

async function main() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('XBRL 全Markdownファイル アップロードスクリプト');
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
      
      console.log(`✅ 進捗: ${processedCount}社/${targetCompanies.length}社完了, ${fileCount}ファイル処理, エラー: ${errorCount}件`);
    }
    
    // 完了レポート
    console.log('');
    console.log('===========================================');
    console.log('アップロード完了');
    console.log('===========================================');
    console.log(`✅ 成功: ${processedCount}社`);
    console.log(`📁 総ファイル数: ${fileCount}ファイル`);
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
      return; // ディレクトリでない場合はスキップ
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
    
    // すべてのMarkdownファイルを処理
    await processAllMarkdownFiles(companyId, docPath, docType, companyDir);
    
    processedCount++;
    
  } catch (error) {
    errorCount++;
    errors.push({
      company: companyDir,
      message: error.message
    });
  }
}

async function processAllMarkdownFiles(companyId, docPath, docType, originalDirName) {
  const files = await fs.readdir(docPath);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  
  if (mdFiles.length === 0) {
    throw new Error('Markdownファイルが見つかりません');
  }
  
  console.log(`  📂 ${originalDirName}: ${mdFiles.length}ファイル検出`);
  
  // 最初のファイルから企業情報を抽出
  const firstContent = await fs.readFile(
    path.join(docPath, mdFiles[0]),
    'utf-8'
  );
  
  const companyInfo = extractCompanyInfo(firstContent, originalDirName);
  const fiscalYear = extractFiscalYear(firstContent);
  
  // 1. 企業マスタをデータベースに保存（最初のファイルのみ）
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
  
  // 2. 各Markdownファイルを個別にアップロード
  for (const mdFile of mdFiles) {
    try {
      const content = await fs.readFile(
        path.join(docPath, mdFile),
        'utf-8'
      );
      
      // ファイル名から順序番号を抽出（例: 0101010_honbun_... → 0101010）
      const orderMatch = mdFile.match(/^(\d+)/);
      const order = orderMatch ? orderMatch[1] : '9999999';
      
      // ストレージパス（年度/企業ID/ファイル名）
      const cleanFileName = mdFile.replace(/[^A-Za-z0-9._-]/g, '_');
      const fileName = `${fiscalYear}/${companyId}/${cleanFileName}`;
      
      // Storageにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('markdown-files')
        .upload(fileName, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (uploadError) {
        console.log(`    ❌ ${mdFile}: ${uploadError.message}`);
        continue;
      }
      
      // データベースにファイル情報を保存
      const { error: reportError } = await supabase
        .from('financial_reports')
        .upsert({
          company_id: companyId,
          fiscal_year: fiscalYear,
          fiscal_period: `${fiscalYear}年3月期`,
          doc_type: `${docType}_${order}`, // ファイルごとにユニークなdoc_type
          storage_path: fileName,
          metadata: {
            original_dir: originalDirName,
            original_file: mdFile,
            file_order: order,
            file_type: getFileType(mdFile)
          }
        }, {
          onConflict: 'company_id,fiscal_year,doc_type'
        });
      
      if (reportError) {
        console.log(`    ❌ DB保存エラー ${mdFile}: ${reportError.message}`);
      } else {
        fileCount++;
      }
      
    } catch (error) {
      console.log(`    ❌ ${mdFile}: ${error.message}`);
    }
  }
}

// ファイルタイプを判定
function getFileType(filename) {
  if (filename.includes('header')) return 'header';
  if (filename.includes('honbun')) return 'body';
  if (filename.includes('keiri')) return 'accounting';
  if (filename.includes('kansa')) return 'audit';
  return 'other';
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

// 実行
main();