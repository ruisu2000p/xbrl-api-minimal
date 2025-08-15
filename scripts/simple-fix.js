require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSingleCompany(companyId) {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  try {
    // ディレクトリを探す
    const allDirs = await fs.readdir(baseDir);
    const companyDir = allDirs.find(dir => dir.startsWith(companyId));
    
    if (!companyDir) {
      console.log('ディレクトリが見つかりません:', companyId);
      return;
    }
    
    console.log('処理中:', companyDir);
    
    const docPath = path.join(baseDir, companyDir, 'PublicDoc_markdown');
    
    // ファイル一覧取得
    const files = await fs.readdir(docPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`${mdFiles.length}ファイル検出`);
    
    // 各ファイルをアップロード
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(docPath, file), 'utf-8');
      const cleanName = file.replace(/[^A-Za-z0-9._-]/g, '_');
      
      const { error } = await supabase.storage
        .from('markdown-files')
        .upload(`2021/${companyId}/${cleanName}`, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (error) {
        console.log('エラー:', file, error.message);
      } else {
        console.log('✓', file);
      }
    }
    
    console.log('完了!');
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// コマンドライン引数から企業IDを取得
const companyId = process.argv[2] || 'S100LIPB';
fixSingleCompany(companyId);