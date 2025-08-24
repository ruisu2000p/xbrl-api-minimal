/**
 * FY2017データ（PublicDoc + AuditDoc）を完全にSupabase Storageにアップロード
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const TurndownService = require('turndown');

// HTML to Markdown converter
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FY2017データのベースパス
const FY2017_BASE_PATH = 'C:\\Users\\pumpk\\OneDrive\\デスクトップ\\アプリ開発\\xbrl\\download_xbrl\\2016_4_1から2017_3_31\\all_markdown_2016_2017_new';

// 企業IDを抽出（フォルダ名から）
function extractCompanyId(folderName) {
  const match = folderName.match(/^([A-Z0-9]+)_/);
  return match ? match[1] : folderName;
}

// 企業名を抽出（フォルダ名から）
function extractCompanyName(folderName) {
  const parts = folderName.split('_');
  if (parts.length >= 2) {
    // 企業名部分を取得（有価証券報告書の前まで）
    const nameMatch = folderName.match(/^[A-Z0-9]+_(.+?)_有価証券報告書/);
    return nameMatch ? nameMatch[1] : parts[1];
  }
  return folderName;
}

// ファイルをアップロード
async function uploadFile(localPath, storagePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fileContent = await fs.readFile(localPath);
      
      // 既存ファイルを削除（もしあれば）
      await supabase.storage
        .from('markdown-files')
        .remove([storagePath]);
      
      // 新しくアップロード
      const { data, error } = await supabase.storage
        .from('markdown-files')
        .upload(storagePath, fileContent, {
          contentType: 'text/markdown',
          upsert: true
        });
      
      if (error) {
        if (attempt === retries) {
          console.error(`Upload error for ${storagePath}: ${error.message}`);
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      return true;
    } catch (err) {
      if (attempt === retries) {
        console.error(`File read error for ${localPath}: ${err.message}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}

// コンテンツを直接アップロード
async function uploadFileContent(content, storagePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 既存ファイルを削除（もしあれば）
      await supabase.storage
        .from('markdown-files')
        .remove([storagePath]);
      
      // 新しくアップロード
      const { data, error } = await supabase.storage
        .from('markdown-files')
        .upload(storagePath, content, {
          contentType: 'text/markdown',
          upsert: true
        });
      
      if (error) {
        if (attempt === retries) {
          console.error(`Upload error for ${storagePath}: ${error.message}`);
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      return true;
    } catch (err) {
      if (attempt === retries) {
        console.error(`Upload error: ${err.message}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}

// 1社分のデータをアップロード（PublicとAudit両方）
async function uploadCompanyData(companyFolder) {
  const companyId = extractCompanyId(companyFolder);
  const companyName = extractCompanyName(companyFolder);
  const localCompanyPath = path.join(FY2017_BASE_PATH, companyFolder);
  
  let totalUploaded = 0;
  let publicCount = 0;
  let auditCount = 0;
  
  try {
    // 企業フォルダ直下のファイルを取得
    const files = await fs.readdir(localCompanyPath);
    
    // Markdownファイルと HTMLファイルを取得
    const markdownFiles = files.filter(f => f.endsWith('.md'));
    const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.htm'));
    
    // 処理するファイルリストを作成
    const filesToProcess = [...markdownFiles];
    
    // HTMLファイルをMarkdownに変換して追加
    for (const htmlFile of htmlFiles) {
      filesToProcess.push({
        name: htmlFile.replace(/\.html?$/i, '.md'),
        isHtml: true,
        originalName: htmlFile
      });
    }
    
    if (filesToProcess.length === 0) {
      console.log(`⚠️ No files to process for ${companyName} (${companyId})`);
      return { success: false, publicCount: 0, auditCount: 0 };
    }
    
    // ファイルを分類してアップロード
    for (const fileInfo of filesToProcess) {
      const file = typeof fileInfo === 'string' ? fileInfo : fileInfo.name;
      const isHtml = typeof fileInfo === 'object' && fileInfo.isHtml;
      const originalFile = isHtml ? fileInfo.originalName : file;
      
      const localFilePath = path.join(localCompanyPath, originalFile);
      
      // ファイル内容を取得
      let content;
      if (isHtml) {
        // HTMLファイルをMarkdownに変換
        const htmlContent = await fs.readFile(localFilePath, 'utf-8');
        content = turndownService.turndown(htmlContent);
      } else {
        // Markdownファイルはそのまま読み込み
        content = await fs.readFile(localFilePath);
      }
      
      // ファイル名からPublicDocかAuditDocかを判定
      let docType = 'PublicDoc'; // デフォルトはPublic
      if (file.includes('jpaud') || file.includes('audit') || file.includes('監査')) {
        docType = 'AuditDoc';
      }
      
      // Storageパス: FY2017/{企業ID}/{docType}/{ファイル名}
      const storageFilePath = `FY2017/${companyId}/${docType}/${file}`;
      
      // アップロード（contentを直接渡す）
      const success = await uploadFileContent(content, storageFilePath);
      if (success) {
        totalUploaded++;
        if (docType === 'PublicDoc') {
          publicCount++;
        } else {
          auditCount++;
        }
      }
    }
    
    if (totalUploaded > 0) {
      console.log(`✅ ${companyName} (${companyId}): ${totalUploaded}/${filesToProcess.length} files (Public: ${publicCount}, Audit: ${auditCount})`);
      return { success: true, publicCount, auditCount };
    } else {
      console.log(`❌ ${companyName} (${companyId}): Upload failed`);
      return { success: false, publicCount: 0, auditCount: 0 };
    }
    
  } catch (err) {
    console.error(`Error processing ${companyName}: ${err.message}`);
    return { success: false, publicCount: 0, auditCount: 0 };
  }
}

// メイン処理
async function main() {
  console.log('=== FY2017データ完全アップロード (PublicDoc + AuditDoc) ===\n');
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
    let totalPublicFiles = 0;
    let totalAuditFiles = 0;
    
    // バッチ処理（5社ずつ - より慎重に）
    const batchSize = 5;
    for (let i = 0; i < totalCompanies; i += batchSize) {
      const batch = companyFolders.slice(i, Math.min(i + batchSize, totalCompanies));
      
      console.log(`\n処理中: ${i + 1}-${Math.min(i + batchSize, totalCompanies)} / ${totalCompanies}`);
      
      // バッチ内の企業を並列処理
      const results = await Promise.all(
        batch.map(folder => uploadCompanyData(folder))
      );
      
      // 結果をカウント
      results.forEach(result => {
        if (result.success) {
          successCount++;
          totalPublicFiles += result.publicCount;
          totalAuditFiles += result.auditCount;
        } else {
          errorCount++;
        }
      });
      
      // 進捗表示
      if ((i + batchSize) % 50 === 0 || i + batchSize >= totalCompanies) {
        console.log(`\n--- 進捗状況 ---`);
        console.log(`完了: ${successCount}/${i + batch.length} 社`);
        console.log(`PublicDocファイル: ${totalPublicFiles}`);
        console.log(`AuditDocファイル: ${totalAuditFiles}`);
        console.log(`総ファイル数: ${totalPublicFiles + totalAuditFiles}`);
      }
      
      // レート制限対策（1秒待機）
      if (i + batchSize < totalCompanies) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 統計情報を表示
    console.log('\n=== アップロード完了 ===');
    console.log(`成功: ${successCount}社`);
    console.log(`エラー: ${errorCount}社`);
    console.log(`合計: ${totalCompanies}社`);
    console.log('');
    console.log(`PublicDocファイル総数: ${totalPublicFiles}`);
    console.log(`AuditDocファイル総数: ${totalAuditFiles}`);
    console.log(`アップロード総ファイル数: ${totalPublicFiles + totalAuditFiles}`);
    
    console.log('\n✅ FY2017データの完全アップロードが完了しました！');
    console.log('Supabase Storageでデータを確認してください。');
    console.log('パス: markdown-files/FY2017/{企業ID}/PublicDoc/ および AuditDoc/');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadCompanyData, extractCompanyId, extractCompanyName };