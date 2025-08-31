/**
 * クイック インポート - 少数ファイルのテスト用
 * 
 * 使用方法:
 * node scripts/quick-import.js [limit]
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
const LIMIT = parseInt(process.argv[2]) || 10; // デフォルト10ファイル

console.log(`🚀 クイックインポート開始 (最大${LIMIT}ファイル)`);

async function quickImport() {
  try {
    // 1. 最初の数フォルダを取得 (FY2021フォルダ内を確認)
    const { data: folders, error: foldersError } = await supabase.storage
      .from('markdown-files')
      .list('FY2021', { limit: 5 });
    
    if (foldersError) {
      console.log('FY2021フォルダが見つからない場合は、ルートフォルダを確認します');
      // ルートフォルダを確認
      const { data: rootFolders, error: rootError } = await supabase.storage
        .from('markdown-files')
        .list('', { limit: 5 });
        
      if (rootError) {
        throw new Error(`フォルダ取得エラー: ${rootError.message}`);
      }
      console.log('ルートフォルダ構造:', rootFolders?.map(f => f.name));
      throw new Error(`FY2021フォルダが見つかりません`);
    }
    
    let fileCount = 0;
    let processedCount = 0;
    
    // 2. 各フォルダ内のファイルを処理
    for (const folder of folders) {
      if (fileCount >= LIMIT) break;
      
      console.log(`\n📁 処理中: ${folder.name}`);
      
      // PublicDoc_markdownフォルダ内のファイルを取得
      const publicDocPath = `${folder.name}/PublicDoc_markdown`;
      const { data: files, error: filesError } = await supabase.storage
        .from('markdown-files')
        .list(publicDocPath, { limit: 5 });
      
      if (filesError || !files) {
        console.log(`  ⚠ ${publicDocPath} にアクセスできません`);
        continue;
      }
      
      // 3. ファイルを処理
      for (const file of files) {
        if (fileCount >= LIMIT || !file.name.endsWith('.md')) continue;
        
        const filePath = `${publicDocPath}/${file.name}`;
        console.log(`  📄 ${file.name}`);
        
        try {
          // ファイル内容を取得
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('markdown-files')
            .download(filePath);
          
          if (downloadError) {
            console.log(`    ❌ ダウンロード失敗: ${downloadError.message}`);
            continue;
          }
          
          const content = await fileData.text();
          const preview = content.substring(0, 500);
          
          // ファイル情報を解析
          let fileType = 'other';
          if (file.name.includes('0101010_honbun')) fileType = 'company_overview';
          else if (file.name.includes('0102010_honbun')) fileType = 'business_overview';
          else if (file.name.includes('0000000_header')) fileType = 'header';
          
          const orderMatch = file.name.match(/^([0-9]+)/);
          const fileOrder = orderMatch ? parseInt(orderMatch[1]) : 9999;
          
          // データベースに挿入
          const { error: insertError } = await supabase
            .from('financial_documents')
            .upsert({
              company_id: folder.name,
              file_name: file.name,
              file_path: filePath,
              file_type: fileType,
              file_order: fileOrder,
              doc_category: 'PublicDoc',
              fiscal_year: 2021,
              storage_path: `markdown-files/${filePath}`,
              content_preview: preview,
              full_content: content,
              metadata: { 
                imported_at: new Date().toISOString(),
                quick_import: true 
              },
              processed_at: new Date().toISOString()
            }, {
              onConflict: 'storage_path'
            });
          
          if (insertError) {
            console.log(`    ❌ DB挿入失敗: ${insertError.message}`);
          } else {
            processedCount++;
            console.log(`    ✅ 処理完了`);
          }
          
          fileCount++;
        } catch (error) {
          console.log(`    ❌ 処理エラー: ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 完了: ${processedCount}/${fileCount} ファイル処理`);
    
    // 結果確認
    const { count } = await supabase
      .from('financial_documents')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 総レコード数: ${count}`);
    
    // サンプル表示
    const { data: samples } = await supabase
      .from('financial_documents')
      .select('company_id, file_type, file_name')
      .limit(5);
    
    if (samples && samples.length > 0) {
      console.log('\n📋 サンプルデータ:');
      samples.forEach(sample => {
        console.log(`  - ${sample.company_id}: ${sample.file_type} (${sample.file_name.substring(0, 50)}...)`);
      });
    }
    
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

quickImport();