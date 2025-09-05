/**
 * Supabase Storageをスキャンしてmarkdown_files_metadataテーブルに投入
 * 
 * 使用方法:
 * node scripts/scan-storage-metadata.js [limit]
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
const LIMIT = parseInt(process.argv[2]) || 1000; // デフォルト1000ファイル

console.log(`🔍 Storage スキャン開始 (最大${LIMIT}ファイル)`);
console.log(`📡 接続先: ${SUPABASE_URL}`);

// ログ出力用の色付け
const log = {
  info: (msg) => console.log('\\x1b[36m%s\\x1b[0m', `ℹ ${msg}`),
  success: (msg) => console.log('\\x1b[32m%s\\x1b[0m', `✓ ${msg}`),
  error: (msg) => console.log('\\x1b[31m%s\\x1b[0m', `✗ ${msg}`),
  warning: (msg) => console.log('\\x1b[33m%s\\x1b[0m', `⚠ ${msg}`)
};

// ファイル情報を解析する関数
function parseFilePath(filePath) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  
  // 企業IDを抽出
  const companyId = parts[0];
  
  // ドキュメントカテゴリを抽出
  let documentType = 'unknown';
  for (const part of parts) {
    if (part.includes('PublicDoc')) {
      documentType = 'PublicDoc';
      break;
    } else if (part.includes('AuditDoc')) {
      documentType = 'AuditDoc';
      break;
    }
  }
  
  // セクションタイプを抽出
  let sectionType = 'unknown';
  if (fileName.startsWith('0000000_header')) {
    sectionType = 'header';
  } else if (fileName.startsWith('0101010_honbun')) {
    sectionType = 'company_overview';
  } else if (fileName.startsWith('0102010_honbun')) {
    sectionType = 'business_overview';
  } else if (fileName.startsWith('0103010_honbun')) {
    sectionType = 'business_risks';
  } else if (fileName.startsWith('0104010_honbun')) {
    sectionType = 'management_analysis';
  } else if (fileName.startsWith('0105000_honbun')) {
    sectionType = 'financial_statements';
  } else if (fileName.includes('_honbun_')) {
    sectionType = 'main_content';
  } else if (fileName.includes('_cover_')) {
    sectionType = 'cover';
  } else {
    sectionType = 'other';
  }
  
  // ファイル順序を抽出
  const orderMatch = fileName.match(/^([0-9]+)/);
  const fileOrder = orderMatch ? parseInt(orderMatch[1]) : 9999;
  
  // 年度を抽出（ファイル名から）
  const yearMatch = fileName.match(/(202[0-9])/);
  const fiscalYear = yearMatch ? parseInt(yearMatch[1]) : null;
  
  return {
    companyId,
    fileName,
    documentType,
    sectionType,
    fileOrder,
    fiscalYear,
    storagePath: `markdown-files/${filePath}`,
    filePath
  };
}

// Storageから全ファイルを再帰的に取得
async function getAllStorageFiles(prefix = '', allFiles = []) {
  try {
    log.info(`📂 スキャン中: ${prefix || 'root'}`);
    
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      log.error(`Storage list error: ${error.message}`);
      return allFiles;
    }
    
    if (!files || files.length === 0) {
      return allFiles;
    }
    
    for (const file of files) {
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
      
      // ディレクトリの場合は再帰的に探索
      if (!file.metadata || file.metadata.size === undefined || file.metadata.size === null) {
        await getAllStorageFiles(fullPath, allFiles);
      } 
      // Markdownファイルの場合はリストに追加
      else if (file.name.endsWith('.md')) {
        allFiles.push({
          path: fullPath,
          name: file.name,
          size: file.metadata.size || 0,
          lastModified: file.updated_at || file.created_at || new Date().toISOString()
        });
        
        // 制限に達したら停止
        if (allFiles.length >= LIMIT) {
          log.warning(`制限に達しました: ${LIMIT}ファイル`);
          break;
        }
      }
    }
    
    return allFiles;
  } catch (error) {
    log.error(`ファイル取得エラー: ${error.message}`);
    return allFiles;
  }
}

// ファイルの最初の部分を取得してプレビューを作成
async function getContentPreview(filePath) {
  try {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .download(filePath);
    
    if (error) {
      log.warning(`プレビュー取得失敗: ${filePath} - ${error.message}`);
      return null;
    }
    
    const content = await data.text();
    
    // 最初の500文字を取得
    const preview = content.substring(0, 500);
    
    // テーブルと画像の存在を確認
    const hasTables = content.includes('|') && content.includes('---');
    const hasImages = /!\\[.*\\]\\(.*\\.(jpg|jpeg|png|gif|svg)\\)/i.test(content);
    
    return {
      preview,
      hasTables,
      hasImages
    };
  } catch (error) {
    log.warning(`プレビュー処理エラー: ${filePath} - ${error.message}`);
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

// データベースにメタデータを挿入
async function insertMetadata(fileInfo, contentData) {
  try {
    const record = {
      company_id: fileInfo.companyId,
      company_name: await getCompanyName(fileInfo.companyId),
      file_name: fileInfo.fileName,
      file_path: fileInfo.filePath,
      storage_path: fileInfo.storagePath,
      fiscal_year: fileInfo.fiscalYear,
      document_type: fileInfo.documentType,
      section_type: fileInfo.sectionType,
      file_order: fileInfo.fileOrder,
      file_size: fileInfo.size,
      file_extension: 'md',
      content_preview: contentData?.preview || '',
      has_tables: contentData?.hasTables || false,
      has_images: contentData?.hasImages || false,
      storage_bucket: 'markdown-files',
      indexed_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('markdown_files_metadata')
      .upsert(record, {
        onConflict: 'file_path',
        ignoreDuplicates: false
      });
    
    if (error) {
      log.error(`メタデータ挿入エラー: ${fileInfo.fileName} - ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`メタデータ処理エラー: ${fileInfo.fileName} - ${error.message}`);
    return false;
  }
}

// メイン処理
async function main() {
  console.log('========================================');
  console.log('📁 Storage メタデータスキャン開始');
  console.log('========================================\\n');
  
  try {
    // 1. ファイル一覧を取得
    log.info('Storageからファイル一覧を取得中...');
    const allFiles = await getAllStorageFiles();
    
    log.success(`合計 ${allFiles.length} 個のMarkdownファイルを検出`);
    
    if (allFiles.length === 0) {
      log.warning('処理対象のファイルが見つかりません');
      return;
    }
    
    // サンプル表示
    console.log('\\n📄 検出されたファイル例:');
    allFiles.slice(0, 3).forEach(file => {
      console.log(`  - ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
    });
    
    // 2. メタデータを処理
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const progress = `[${i + 1}/${allFiles.length}]`;
      
      if (i % 10 === 0) {
        console.log(`\\n${progress} 処理中: ${file.path}`);
      }
      
      // ファイル情報を解析
      const fileInfo = {
        ...parseFilePath(file.path),
        size: file.size,
        lastModified: file.lastModified
      };
      
      // 内容のプレビューを取得（最初の50ファイルのみ）
      let contentData = null;
      if (i < 50) {
        contentData = await getContentPreview(file.path);
      }
      
      // データベースに挿入
      const success = await insertMetadata(fileInfo, contentData);
      
      if (success) {
        processedCount++;
        if (i % 10 === 0) {
          log.success(`  ✓ ${fileInfo.companyId} - ${fileInfo.sectionType}`);
        }
      } else {
        errorCount++;
      }
      
      // 進捗表示
      if ((i + 1) % 50 === 0) {
        log.info(`進捗: ${i + 1}/${allFiles.length} (${Math.round((i + 1) / allFiles.length * 100)}%)`);
      }
    }
    
    // 3. 結果表示
    console.log('\\n========================================');
    console.log('📊 スキャン完了');
    console.log('========================================');
    log.success(`処理済み: ${processedCount} ファイル`);
    if (errorCount > 0) {
      log.error(`エラー: ${errorCount} ファイル`);
    }
    
    // 4. 統計情報
    const { count } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    log.info(`メタデータテーブル総レコード数: ${count}`);
    
    // 企業別統計
    const { data: companyStats } = await supabase
      .from('markdown_files_summary')
      .select('company_id, company_name, document_type, file_count')
      .limit(10);
    
    if (companyStats && companyStats.length > 0) {
      console.log('\\n📈 企業別統計（上位10社）:');
      companyStats.forEach(stat => {
        console.log(`  - ${stat.company_name || stat.company_id}: ${stat.file_count}ファイル (${stat.document_type})`);
      });
    }
    
  } catch (error) {
    log.error(`処理エラー: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    log.error(`実行エラー: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, parseFilePath, getContentPreview };