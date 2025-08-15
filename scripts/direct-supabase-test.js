require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  console.log('Direct Supabase Test');
  console.log('====================');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('URL exists:', !!url);
  console.log('Key exists:', !!key);
  
  if (!url || !key) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(url, key);
  
  // S100LJ4Fのファイルを確認
  console.log('\nS100LJ4Fのファイル一覧を取得中...');
  
  const { data: files, error } = await supabase.storage
    .from('markdown-files')
    .list('2021/S100LJ4F', { limit: 10 });
  
  if (error) {
    console.error('エラー:', error);
  } else {
    console.log(`✅ ${files.length}ファイル見つかりました`);
    files.forEach(f => {
      console.log(`  - ${f.name} (${Math.round(f.metadata.size / 1024)}KB)`);
    });
  }
}

test().catch(console.error);