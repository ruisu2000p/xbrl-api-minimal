require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';

async function checkCompany(companyId) {
  console.log(`\n========== ${companyId} ==========`);
  
  try {
    // ローカルディレクトリを探す
    const allDirs = await fs.readdir(baseDir);
    const companyDir = allDirs.find(dir => dir.startsWith(companyId));
    
    if (!companyDir) {
      console.log('❌ ローカルディレクトリが見つかりません');
      return;
    }
    
    console.log(`📁 ローカルディレクトリ: ${companyDir}`);
    
    // ローカルのMarkdownファイルを確認
    let localFiles = [];
    const publicDocPath = path.join(baseDir, companyDir, 'PublicDoc_markdown');
    const auditDocPath = path.join(baseDir, companyDir, 'AuditDoc_markdown');
    
    let docPath = null;
    try {
      await fs.access(publicDocPath);
      docPath = publicDocPath;
      console.log('  タイプ: PublicDoc_markdown');
    } catch {
      try {
        await fs.access(auditDocPath);
        docPath = auditDocPath;
        console.log('  タイプ: AuditDoc_markdown');
      } catch {
        console.log('❌ Markdownディレクトリが見つかりません');
        return;
      }
    }
    
    const files = await fs.readdir(docPath);
    localFiles = files.filter(f => f.endsWith('.md'));
    console.log(`\n📂 ローカルファイル: ${localFiles.length}個`);
    
    // 最初の5ファイルを表示
    for (let i = 0; i < Math.min(5, localFiles.length); i++) {
      const filePath = path.join(docPath, localFiles[i]);
      const stats = await fs.stat(filePath);
      console.log(`  - ${localFiles[i]} (${Math.round(stats.size / 1024)}KB)`);
    }
    if (localFiles.length > 5) {
      console.log(`  ... 他${localFiles.length - 5}ファイル`);
    }
    
    // Supabaseのファイルを確認
    const { data: remoteFiles2021 } = await supabase.storage
      .from('markdown-files')
      .list(`2021/${companyId}`, { limit: 100 });
    
    const { data: remoteFiles2022 } = await supabase.storage
      .from('markdown-files')
      .list(`2022/${companyId}`, { limit: 100 });
    
    const remoteCount2021 = remoteFiles2021 ? remoteFiles2021.length : 0;
    const remoteCount2022 = remoteFiles2022 ? remoteFiles2022.length : 0;
    
    console.log(`\n☁️ Supabaseファイル:`);
    console.log(`  2021年: ${remoteCount2021}個`);
    console.log(`  2022年: ${remoteCount2022}個`);
    
    // 比較結果
    console.log(`\n📊 比較結果:`);
    if (localFiles.length === remoteCount2021) {
      console.log(`  ✅ 完全一致: ローカル(${localFiles.length}) = Supabase 2021(${remoteCount2021})`);
    } else if (localFiles.length === remoteCount2022) {
      console.log(`  ⚠️ 2022フォルダと一致: ローカル(${localFiles.length}) = Supabase 2022(${remoteCount2022})`);
    } else {
      console.log(`  ❌ 不一致: ローカル(${localFiles.length}) ≠ Supabase(2021:${remoteCount2021}, 2022:${remoteCount2022})`);
      
      // 不足ファイルを特定
      if (remoteFiles2021 && remoteFiles2021.length > 0) {
        const remoteNames = new Set(remoteFiles2021.map(f => f.name));
        const localNames = new Set(localFiles.map(f => f.replace(/[^A-Za-z0-9._-]/g, '_')));
        
        const missingInRemote = [];
        const missingInLocal = [];
        
        localNames.forEach(name => {
          if (!remoteNames.has(name)) {
            missingInRemote.push(name);
          }
        });
        
        remoteNames.forEach(name => {
          if (!localNames.has(name)) {
            missingInLocal.push(name);
          }
        });
        
        if (missingInRemote.length > 0) {
          console.log(`  📤 Supabaseに不足: ${missingInRemote.length}ファイル`);
          missingInRemote.slice(0, 3).forEach(f => console.log(`    - ${f}`));
        }
        
        if (missingInLocal.length > 0) {
          console.log(`  📥 ローカルに不足: ${missingInLocal.length}ファイル`);
          missingInLocal.slice(0, 3).forEach(f => console.log(`    - ${f}`));
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }
}

async function main() {
  const companies = process.argv.slice(2);
  
  if (companies.length === 0) {
    companies.push('S100LJ4F', 'S100LJ65', 'S100LJ64', 'S100LJ5C');
  }
  
  console.log('===========================================');
  console.log('ローカル vs Supabase ファイル検証');
  console.log('===========================================');
  
  for (const company of companies) {
    await checkCompany(company);
  }
  
  console.log('\n===========================================');
}

main();