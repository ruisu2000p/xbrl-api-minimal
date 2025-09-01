// ストレージアクセスの詳細デバッグ
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugStorageAccess() {
  console.log('=== ストレージアクセス デバッグ ===\n');

  try {
    // 1. 環境変数確認
    console.log('1. 環境変数確認:');
    console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...`);
    console.log(`  SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`);
    console.log();

    // 2. バケット情報取得
    console.log('2. バケット情報:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('  エラー:', bucketsError);
    } else if (buckets) {
      buckets.forEach(bucket => {
        console.log(`  バケット: ${bucket.name}`);
        console.log(`    - ID: ${bucket.id}`);
        console.log(`    - Public: ${bucket.public}`);
        console.log(`    - Created: ${bucket.created_at}`);
      });
    }
    console.log();

    // 3. ストレージ内のファイルリスト取得
    console.log('3. markdown-filesバケット内のファイル確認:');
    
    // FY2020フォルダを確認
    const { data: fy2020Files, error: fy2020Error } = await supabase.storage
      .from('markdown-files')
      .list('S100LJ4F', {
        limit: 10
      });
    
    if (fy2020Error) {
      console.log('  S100LJ4F直下: エラー', fy2020Error);
    } else if (fy2020Files && fy2020Files.length > 0) {
      console.log('  S100LJ4F直下のファイル/フォルダ:');
      fy2020Files.forEach(item => {
        console.log(`    - ${item.name} (${item.metadata ? 'file' : 'folder'})`);
      });
    } else {
      console.log('  S100LJ4F直下: ファイルなし');
    }
    console.log();

    // S100LJ4F/PublicDoc_markdownを確認
    const { data: publicFiles, error: publicError } = await supabase.storage
      .from('markdown-files')
      .list('S100LJ4F/PublicDoc_markdown', {
        limit: 5
      });
    
    if (publicError) {
      console.log('  S100LJ4F/PublicDoc_markdown: エラー', publicError);
    } else if (publicFiles && publicFiles.length > 0) {
      console.log('  S100LJ4F/PublicDoc_markdownのファイル:');
      publicFiles.forEach(item => {
        console.log(`    - ${item.name}`);
      });
    } else {
      console.log('  S100LJ4F/PublicDoc_markdown: ファイルなし');
    }
    console.log();

    // 4. 実際のパスでファイル取得テスト
    console.log('4. 具体的なファイル取得テスト:');
    
    // metadataから取得したパスをテスト
    const testPaths = [
      'S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
      'FY2024/S100TMYO/PublicDoc/0102010_honbun_jpcrp030000-asr-001_E00385-000_2024-03-31_01_2024-06-18_ixbrl.md',
      'markdown-files/S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md'
    ];

    for (const path of testPaths) {
      console.log(`\n  パス: ${path}`);
      
      // downloadメソッドでテスト
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('markdown-files')
        .download(path);
      
      if (downloadError) {
        console.log(`    download() エラー: ${JSON.stringify(downloadError)}`);
      } else if (downloadData) {
        const text = await downloadData.text();
        console.log(`    download() 成功! サイズ: ${text.length} 文字`);
        console.log(`    最初の100文字: ${text.substring(0, 100)}...`);
      }
      
      // getPublicUrlメソッドでテスト
      const { data: urlData } = supabase.storage
        .from('markdown-files')
        .getPublicUrl(path);
      
      if (urlData?.publicUrl) {
        console.log(`    Public URL: ${urlData.publicUrl}`);
        
        // URLから直接取得を試みる
        try {
          const response = await fetch(urlData.publicUrl, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
            }
          });
          
          if (response.ok) {
            const text = await response.text();
            console.log(`    URL取得 成功! サイズ: ${text.length} 文字`);
          } else {
            console.log(`    URL取得 失敗: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.log(`    URL取得 エラー: ${fetchError.message}`);
        }
      }
    }
    console.log();

    // 5. createSignedUrlでテスト
    console.log('\n5. 署名付きURL生成テスト:');
    const testPath = 'S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md';
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('markdown-files')
      .createSignedUrl(testPath, 60); // 60秒有効
    
    if (signedUrlError) {
      console.log(`  エラー: ${JSON.stringify(signedUrlError)}`);
    } else if (signedUrlData?.signedUrl) {
      console.log(`  署名付きURL生成成功!`);
      console.log(`  URL: ${signedUrlData.signedUrl.substring(0, 100)}...`);
      
      // 署名付きURLから取得
      try {
        const response = await fetch(signedUrlData.signedUrl);
        if (response.ok) {
          const text = await response.text();
          console.log(`  取得成功! サイズ: ${text.length} 文字`);
          console.log(`  最初の200文字:\n${text.substring(0, 200)}`);
        } else {
          console.log(`  取得失敗: ${response.status}`);
        }
      } catch (error) {
        console.log(`  取得エラー: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// 実行
debugStorageAccess().catch(console.error);