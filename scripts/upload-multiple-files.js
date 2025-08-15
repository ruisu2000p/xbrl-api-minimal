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
let processedCompanies = 0;
let processedFiles = 0;
let errorCount = 0;
const errors = [];

async function main() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('XBRL 複数Markdownファイル アップロードスクリプト');
  console.log('===========================================');
  console.log('ソースディレクトリ:', baseDir);
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');
  
  try {
    // financial_documentsテーブルの存在確認
    const { data: testData, error: testError } = await supabase
      .from('financial_documents')
      .select('id')
      .limit(1);
    
    if (testError && testError.message.includes('relation')) {
      console.log('❌ financial_documentsテーブルが存在しません。');
      console.log('   modify-database-schema.jsを実行するか、');
      console.log('   Supabaseダッシュボードでテーブルを作成してください。');
      return;
    }
    
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
      
      console.log(`✅ 進捗: ${processedCompanies}社/${targetCompanies.length}社, ${processedFiles}ファイル処理, エラー: ${errorCount}件`);
    }
    
    // 完了レポート
    console.log('');
    console.log('===========================================');
    console.log('アップロード完了');
    console.log('===========================================');
    console.log(`✅ 処理企業数: ${processedCompanies}社`);
    console.log(`📁 処理ファイル数: ${processedFiles}ファイル`);
    console.log(`❌ エラー: ${errorCount}件`);
    
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
    let docCategory = 'public';
    
    try {
      await fs.access(publicDocPath);
    } catch {
      // PublicDocがない場合はAuditDocを試す
      const auditDocPath = path.join(companyPath, 'AuditDoc_markdown');
      try {
        await fs.access(auditDocPath);
        docPath = auditDocPath;
        docCategory = 'audit';
      } catch {
        throw new Error('Markdownディレクトリが見つかりません');
      }
    }
    
    // すべてのMarkdownファイルを処理
    await uploadAllFiles(companyId, docPath, docCategory, companyDir);
    
    processedCompanies++;
    
  } catch (error) {
    errorCount++;
    errors.push({
      company: companyDir,
      message: error.message
    });
  }
}

async function uploadAllFiles(companyId, docPath, docCategory, originalDirName) {
  const files = await fs.readdir(docPath);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort(); // ファイル名順にソート
  
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
  
  // 1. 企業マスタを更新（まだ存在しない場合）
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .single();
  
  if (!existingCompany) {
    const { error: companyError } = await supabase
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
  }
  
  // 2. 各Markdownファイルを個別にアップロード
  let fileUploadCount = 0;
  
  for (let index = 0; index < mdFiles.length; index++) {
    const mdFile = mdFiles[index];
    
    try {
      const content = await fs.readFile(
        path.join(docPath, mdFile),
        'utf-8'
      );
      
      // ファイル名から情報を抽出
      const orderMatch = mdFile.match(/^(\d+)/);
      const fileOrder = orderMatch ? orderMatch[1] : String(index).padStart(7, '0');
      const fileType = getFileType(mdFile);
      
      // ストレージパス
      const cleanFileName = mdFile.replace(/[^A-Za-z0-9._-]/g, '_');
      const storagePath = `${fiscalYear}/${companyId}/${docCategory}/${cleanFileName}`;
      
      // Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from('markdown-files')
        .upload(storagePath, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (uploadError) {
        console.log(`    ❌ アップロードエラー ${mdFile}: ${uploadError.message}`);
        continue;
      }
      
      // financial_documentsテーブルに保存
      const { error: docError } = await supabase
        .from('financial_documents')
        .upsert({
          company_id: companyId,
          fiscal_year: fiscalYear,
          doc_category: docCategory,
          file_name: mdFile,
          file_order: fileOrder,
          file_type: fileType,
          storage_path: storagePath,
          content_preview: content.substring(0, 1000), // 最初の1000文字
          metadata: {
            original_dir: originalDirName,
            file_index: index,
            file_size: content.length
          }
        }, {
          onConflict: 'company_id,fiscal_year,doc_category,file_name'
        });
      
      if (docError) {
        console.log(`    ❌ DB保存エラー ${mdFile}: ${docError.message}`);
      } else {
        fileUploadCount++;
        processedFiles++;
      }
      
    } catch (error) {
      console.log(`    ❌ ${mdFile}: ${error.message}`);
    }
  }
  
  console.log(`    ✅ ${fileUploadCount}/${mdFiles.length}ファイルをアップロード`);
  
  // 3. financial_reportsテーブルも更新（サマリー情報として）
  if (fileUploadCount > 0) {
    const { error: reportError } = await supabase
      .from('financial_reports')
      .upsert({
        company_id: companyId,
        fiscal_year: fiscalYear,
        fiscal_period: `${fiscalYear}年3月期`,
        doc_type: docCategory,
        storage_path: `${fiscalYear}/${companyId}/${docCategory}/`,
        metadata: {
          original_dir: originalDirName,
          total_files: mdFiles.length,
          uploaded_files: fileUploadCount,
          files: mdFiles
        }
      }, {
        onConflict: 'company_id,fiscal_year,doc_type'
      });
    
    if (reportError && !reportError.message.includes('duplicate')) {
      console.log(`    ⚠️ サマリー更新エラー: ${reportError.message}`);
    }
  }
}

// ファイルタイプを判定
function getFileType(filename) {
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('header')) return 'header';
  if (lowerName.includes('honbun')) return 'body';
  if (lowerName.includes('keiri')) return 'accounting';
  if (lowerName.includes('kansa')) return 'audit';
  if (lowerName.includes('cover')) return 'cover';
  if (lowerName.includes('toc')) return 'toc';
  if (lowerName.includes('summary')) return 'summary';
  if (lowerName.includes('business')) return 'business';
  if (lowerName.includes('finance')) return 'finance';
  if (lowerName.includes('management')) return 'management';
  if (lowerName.includes('corporate')) return 'corporate';
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
  } else {
    // 企業名パターンのバリエーション
    const altNameMatch = dirName.match(/_([\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]+)/);
    if (altNameMatch) {
      info.name = altNameMatch[1];
    }
  }
  
  // 内容から証券コードを抽出
  const tickerMatch = content.match(/証券コード[：:\s]*(\d{4})/);
  if (tickerMatch) {
    info.ticker = tickerMatch[1];
  }
  
  // 業種を抽出
  const sectorMatch = content.match(/事業の種類[：:\s]*([^\n]+)/);
  if (sectorMatch) {
    info.sector = sectorMatch[1].trim();
  }
  
  return info;
}

// 年度を抽出
function extractFiscalYear(content) {
  // より正確な年度抽出パターン
  const patterns = [
    /(\d{4})年3月期/,
    /令和(\d+)年.*3月31日/,
    /平成(\d+)年.*3月31日/,
    /(\d{4})年.*3月31日/,
    /第\d+期.*(\d{4})年/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      if (pattern.source.includes('令和')) {
        return 2018 + parseInt(match[1]); // 令和元年 = 2019年
      } else if (pattern.source.includes('平成')) {
        return 1988 + parseInt(match[1]); // 平成元年 = 1989年
      } else if (match[1] && match[1].length === 4) {
        return parseInt(match[1]);
      }
    }
  }
  
  return 2022; // デフォルト
}

// 実行
main();