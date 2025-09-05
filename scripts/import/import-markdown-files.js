/**
 * Supabase StorageのMarkdownファイルをfinancial_documentsテーブルにインポート
 * 
 * 使用方法:
 * node scripts/import-markdown-files.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs/promises');
const path = require('path');

// Supabase設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ログ出力用の色付け
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `ℹ ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `✓ ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `✗ ${msg}`),
  warning: (msg) => console.log('\x1b[33m%s\x1b[0m', `⚠ ${msg}`)
};

// ファイル情報を解析する関数
function parseFilePath(filePath) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  
  // 企業IDを抽出
  const companyId = parts[0];
  
  // ドキュメントカテゴリを抽出
  let docCategory = 'PublicDoc'; // デフォルト
  for (const part of parts) {
    if (part.includes('PublicDoc') || part.includes('AuditDoc')) {
      docCategory = part.includes('PublicDoc') ? 'PublicDoc' : 'AuditDoc';
      break;
    }
  }
  
  // ファイルタイプを抽出
  let fileType = 'other';
  if (fileName.startsWith('0000000_header')) {
    fileType = 'header';
  } else if (fileName.startsWith('0101010_honbun')) {
    fileType = 'company_overview';
  } else if (fileName.startsWith('0102010_honbun')) {
    fileType = 'business_overview';
  } else if (fileName.startsWith('0103010_honbun')) {
    fileType = 'business_risks';
  } else if (fileName.startsWith('0104010_honbun')) {
    fileType = 'management_analysis';
  } else if (fileName.startsWith('0105000_honbun')) {
    fileType = 'financial_statements';
  } else if (fileName.includes('_honbun_')) {
    fileType = 'main_content';
  }
  
  // ファイル順序を抽出
  const orderMatch = fileName.match(/^([0-9]+)/);
  const fileOrder = orderMatch ? parseInt(orderMatch[1]) : 9999;
  
  // 年度を抽出（ファイル名から）
  const yearMatch = fileName.match(/(\d{4})/);
  const fiscalYear = yearMatch ? parseInt(yearMatch[1]) : null;
  
  return {
    companyId,
    fileName,
    fileType,
    fileOrder,
    docCategory,
    fiscalYear,
    storagePath: `markdown-files/${filePath}`
  };
}

// Storageからファイル一覧を取得
async function listStorageFiles(prefix = '', limit = 1000) {
  try {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .list(prefix, {
        limit,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      throw new Error(`Storage list error: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    log.error(`ファイル一覧取得エラー: ${error.message}`);
    return [];
  }
}

// 再帰的にすべてのファイルを取得
async function getAllFiles(prefix = '', allFiles = []) {
  const files = await listStorageFiles(prefix);
  
  for (const file of files) {
    const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
    
    if (file.metadata && file.metadata.size === undefined) {
      // ディレクトリの場合、再帰的に探索
      await getAllFiles(fullPath, allFiles);
    } else if (file.name.endsWith('.md')) {
      // Markdownファイルの場合、リストに追加
      allFiles.push({
        path: fullPath,
        name: file.name,
        size: file.metadata?.size || 0,
        lastModified: file.updated_at || file.created_at
      });
    }
  }
  
  return allFiles;
}

// ファイル内容を取得
async function getFileContent(filePath) {
  try {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .download(filePath);
    
    if (error) {
      throw new Error(`Download error: ${error.message}`);
    }
    
    const content = await data.text();
    return content;
  } catch (error) {
    log.warning(`ファイル読み取り失敗: ${filePath} - ${error.message}`);
    return null;
  }
}

// 企業名を取得
async function getCompanyName(companyId) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.name;
  } catch (error) {
    return null;
  }
}

// データベースにファイル情報を挿入
async function insertFileRecord(fileInfo, content) {
  const contentPreview = content ? content.substring(0, 1000) : '';
  
  const record = {
    company_id: fileInfo.companyId,
    company_name: await getCompanyName(fileInfo.companyId),
    file_name: fileInfo.fileName,
    file_path: fileInfo.path,
    file_type: fileInfo.fileType,
    file_order: fileInfo.fileOrder,
    doc_category: fileInfo.docCategory,
    fiscal_year: fileInfo.fiscalYear,
    file_size: fileInfo.size,
    storage_path: fileInfo.storagePath,
    content_preview: contentPreview,
    full_content: content,
    metadata: {
      last_modified: fileInfo.lastModified,
      file_extension: 'md',
      imported_at: new Date().toISOString()
    },
    processed_at: new Date().toISOString()
  };
  
  try {
    const { error } = await supabase
      .from('financial_documents')
      .upsert(record, {
        onConflict: 'storage_path',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw new Error(`Insert error: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    log.error(`データ挿入エラー: ${fileInfo.fileName} - ${error.message}`);
    return false;
  }
}

// メイン処理
async function main() {
  console.log('========================================');
  console.log('📁 Markdown Files インポート開始');
  console.log('========================================\n');
  
  try {
    // 1. ファイル一覧を取得
    log.info('Storageからファイル一覧を取得中...');
    const allFiles = await getAllFiles();
    
    log.success(`合計 ${allFiles.length} 個のMarkdownファイルを検出`);
    
    if (allFiles.length === 0) {
      log.warning('処理対象のファイルが見つかりません');
      return;
    }
    
    // 2. ファイルを処理
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const progress = `[${i + 1}/${allFiles.length}]`;
      
      console.log(`\n${progress} 処理中: ${file.path}`);
      
      // ファイル情報を解析
      const fileInfo = {
        ...parseFilePath(file.path),
        path: file.path,
        size: file.size,
        lastModified: file.lastModified
      };
      
      // ファイル内容を取得
      const content = await getFileContent(file.path);
      
      if (content === null) {
        errorCount++;
        continue;
      }
      
      // データベースに挿入
      const success = await insertFileRecord(fileInfo, content);
      
      if (success) {
        processedCount++;
        log.success(`  ✓ ${fileInfo.companyId} - ${fileInfo.fileType}`);
      } else {
        errorCount++;
      }
      
      // 10ファイルごとに進捗表示
      if ((i + 1) % 10 === 0) {
        log.info(`進捗: ${i + 1}/${allFiles.length} (${Math.round((i + 1) / allFiles.length * 100)}%)`);
      }
    }
    
    // 3. 結果表示
    console.log('\n========================================');
    console.log('📊 インポート完了');
    console.log('========================================');
    log.success(`処理済み: ${processedCount} ファイル`);
    if (errorCount > 0) {
      log.error(`エラー: ${errorCount} ファイル`);
    }
    
    // 4. 統計情報
    const { count } = await supabase
      .from('financial_documents')
      .select('*', { count: 'exact', head: true });
    
    log.info(`データベース総レコード数: ${count}`);
    
    // 企業別統計
    const { data: companyStats } = await supabase
      .from('financial_documents')
      .select('company_id, company_name')
      .limit(10);
    
    if (companyStats && companyStats.length > 0) {
      console.log('\n📈 企業別サンプル:');
      companyStats.forEach(stat => {
        console.log(`  - ${stat.company_name || stat.company_id}`);
      });
    }
    
  } catch (error) {
    log.error(`処理エラー: ${error.message}`);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    log.error(`実行エラー: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, parseFilePath, getFileContent };