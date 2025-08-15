require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAllIncompleteCompanies() {
  console.log('1ファイルのみの企業を検出中...');
  const { data: dirs } = await supabase.storage
    .from('markdown-files')
    .list('2022', { limit: 10000 });
  
  const incompleteCompanies = [];
  
  for (const dir of dirs || []) {
    const { data: files } = await supabase.storage
      .from('markdown-files')
      .list(`2022/${dir.name}`, { limit: 2 });
    
    if (files?.length === 1) {
      incompleteCompanies.push(dir.name);
    }
  }
  
  console.log(`${incompleteCompanies.length}社が1ファイルのみ`);
  return incompleteCompanies;
}

async function fixCompany(companyId) {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  try {
    const allDirs = await fs.readdir(baseDir);
    const companyDir = allDirs.find(dir => dir.startsWith(companyId));
    
    if (!companyDir) {
      return { success: false, error: 'ディレクトリなし' };
    }
    
    const docPath = path.join(baseDir, companyDir, 'PublicDoc_markdown');
    
    try {
      await fs.access(docPath);
    } catch {
      const auditPath = path.join(baseDir, companyDir, 'AuditDoc_markdown');
      try {
        await fs.access(auditPath);
        docPath = auditPath;
      } catch {
        return { success: false, error: 'Markdownディレクトリなし' };
      }
    }
    
    const files = await fs.readdir(docPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    if (mdFiles.length <= 1) {
      return { success: false, error: `${mdFiles.length}ファイルのみ` };
    }
    
    // アップロード
    let uploadCount = 0;
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(docPath, file), 'utf-8');
      const cleanName = file.replace(/[^A-Za-z0-9._-]/g, '_');
      
      const { error } = await supabase.storage
        .from('markdown-files')
        .upload(`2021/${companyId}/${cleanName}`, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (!error) uploadCount++;
    }
    
    return { success: true, files: uploadCount };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('===========================================');
  console.log('バッチ修正スクリプト');
  console.log('===========================================');
  
  const companies = await getAllIncompleteCompanies();
  
  const BATCH_SIZE = 5;
  let successCount = 0;
  let errorCount = 0;
  let totalFiles = 0;
  
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, Math.min(i + BATCH_SIZE, companies.length));
    
    console.log(`\nバッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${i + 1}〜${Math.min(i + BATCH_SIZE, companies.length)}/${companies.length}社`);
    
    const results = await Promise.all(batch.map(async companyId => {
      const result = await fixCompany(companyId);
      if (result.success) {
        console.log(`  ✓ ${companyId}: ${result.files}ファイル`);
        successCount++;
        totalFiles += result.files;
      } else {
        console.log(`  ✗ ${companyId}: ${result.error}`);
        errorCount++;
      }
      return result;
    }));
  }
  
  console.log('\n===========================================');
  console.log('完了');
  console.log('===========================================');
  console.log(`✅ 成功: ${successCount}社`);
  console.log(`❌ エラー: ${errorCount}社`);
  console.log(`📁 総ファイル数: ${totalFiles}`);
}

main().catch(console.error);