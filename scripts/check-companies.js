require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCompany(companyId) {
  try {
    // 2021フォルダをチェック
    const { data: files2021 } = await supabase.storage
      .from('markdown-files')
      .list(`2021/${companyId}`, { limit: 100 });
    
    // 2022フォルダをチェック  
    const { data: files2022 } = await supabase.storage
      .from('markdown-files')
      .list(`2022/${companyId}`, { limit: 100 });
    
    console.log(`\n${companyId}:`);
    
    if (files2021 && files2021.length > 0) {
      console.log(`  2021年: ${files2021.length}ファイル`);
      files2021.slice(0, 5).forEach(f => {
        const sizeKB = f.metadata ? Math.round(f.metadata.size / 1024) : 0;
        console.log(`    - ${f.name} (${sizeKB}KB)`);
      });
      if (files2021.length > 5) {
        console.log(`    ... 他${files2021.length - 5}ファイル`);
      }
    } else {
      console.log('  2021年: データなし');
    }
    
    if (files2022 && files2022.length > 0) {
      console.log(`  2022年: ${files2022.length}ファイル`);
    } else {
      console.log('  2022年: データなし');
    }
    
  } catch (error) {
    console.error(`エラー ${companyId}:`, error.message);
  }
}

async function main() {
  const companies = process.argv.slice(2);
  
  if (companies.length === 0) {
    companies.push('S100LJ4F', 'S100LJ65', 'S100LJ64', 'S100LJ5C');
  }
  
  console.log('===========================================');
  console.log('企業データ確認');
  console.log('===========================================');
  
  for (const company of companies) {
    await checkCompany(company);
  }
}

main();