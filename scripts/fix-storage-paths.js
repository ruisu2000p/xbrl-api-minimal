// ストレージパスの修正と確認
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixStoragePaths() {
  console.log('=== ストレージパス修正 ===\n');

  try {
    // 1. 実際に存在するフォルダ構造を確認
    console.log('1. ストレージ内のフォルダ構造確認:');
    
    // ルートレベル
    const { data: rootFolders, error: rootError } = await supabase.storage
      .from('markdown-files')
      .list('', { limit: 20 });
    
    if (rootError) {
      console.log('  ルートエラー:', rootError);
    } else if (rootFolders) {
      console.log('  ルートフォルダ:');
      rootFolders.forEach(folder => {
        console.log(`    - ${folder.name}/`);
      });
      
      // FY2024フォルダの中を確認
      if (rootFolders.find(f => f.name === 'FY2024')) {
        const { data: fy2024Folders } = await supabase.storage
          .from('markdown-files')
          .list('FY2024', { limit: 5 });
        
        if (fy2024Folders && fy2024Folders.length > 0) {
          console.log('\n  FY2024内のフォルダ（最初の5件）:');
          fy2024Folders.forEach(folder => {
            console.log(`    - FY2024/${folder.name}/`);
          });
        }
      }
      
      // FY2020フォルダの確認
      if (rootFolders.find(f => f.name === 'FY2020')) {
        const { data: fy2020Folders } = await supabase.storage
          .from('markdown-files')
          .list('FY2020', { limit: 5 });
        
        if (fy2020Folders && fy2020Folders.length > 0) {
          console.log('\n  FY2020内のフォルダ（最初の5件）:');
          fy2020Folders.forEach(folder => {
            console.log(`    - FY2020/${folder.name}/`);
          });
        }
      }
    }
    console.log();

    // 2. 亀田製菓のファイルを探す
    console.log('2. 亀田製菓のファイルパスを探索:');
    
    // S100LJ4Fを探す（FY2020またはFY2021の可能性）
    const possiblePaths = [
      'FY2020/S100LJ4F',
      'FY2021/S100LJ4F',
      'S100LJ4F'
    ];
    
    for (const basePath of possiblePaths) {
      const { data: files } = await supabase.storage
        .from('markdown-files')
        .list(basePath, { limit: 5 });
      
      if (files && files.length > 0) {
        console.log(`  ${basePath}/ が存在:`);
        files.forEach(item => {
          console.log(`    - ${item.name}`);
        });
        
        // PublicDocまたはPublicDoc_markdownを確認
        const subPaths = ['PublicDoc', 'PublicDoc_markdown'];
        for (const subPath of subPaths) {
          const fullPath = `${basePath}/${subPath}`;
          const { data: subFiles } = await supabase.storage
            .from('markdown-files')
            .list(fullPath, { limit: 3 });
          
          if (subFiles && subFiles.length > 0) {
            console.log(`\n  ${fullPath}/ のファイル:`);
            subFiles.forEach(file => {
              console.log(`    - ${file.name}`);
            });
          }
        }
      }
    }
    console.log();

    // 3. metadataのstorage_pathを修正
    console.log('3. metadata内のstorage_pathパターン分析:');
    
    // 現在のstorage_pathパターンを確認
    const { data: pathPatterns } = await supabase
      .from('markdown_files_metadata')
      .select('storage_path, fiscal_year, company_id')
      .not('storage_path', 'is', null)
      .limit(20);
    
    if (pathPatterns) {
      const patterns = {};
      pathPatterns.forEach(record => {
        const pathStart = record.storage_path.split('/').slice(0, 2).join('/');
        if (!patterns[pathStart]) {
          patterns[pathStart] = [];
        }
        patterns[pathStart].push(record);
      });
      
      console.log('  パスパターン:');
      Object.entries(patterns).forEach(([pattern, records]) => {
        console.log(`    ${pattern}: ${records.length}件`);
        if (records[0]) {
          console.log(`      例: ${records[0].storage_path}`);
        }
      });
    }
    console.log();

    // 4. FY2024の亀田製菓（S100TMYO）でテスト
    console.log('4. FY2024亀田製菓(S100TMYO)のファイル取得テスト:');
    
    const { data: kamedaFY2024 } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', 'S100TMYO')
      .eq('fiscal_year', '2024')
      .limit(1);
    
    if (kamedaFY2024 && kamedaFY2024[0]) {
      const record = kamedaFY2024[0];
      console.log(`  メタデータのパス: ${record.storage_path}`);
      
      // storage_pathから"markdown-files/"プレフィックスを削除
      const cleanPath = record.storage_path.replace(/^markdown-files\//, '');
      console.log(`  クリーンパス: ${cleanPath}`);
      
      const { data: fileData, error: fileError } = await supabase.storage
        .from('markdown-files')
        .download(cleanPath);
      
      if (fileError) {
        console.log(`  エラー: ${JSON.stringify(fileError)}`);
      } else if (fileData) {
        const text = await fileData.text();
        console.log(`  成功! ファイルサイズ: ${text.length} 文字`);
        console.log(`  最初の300文字:\n${text.substring(0, 300)}`);
      }
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// 実行
fixStoragePaths().catch(console.error);