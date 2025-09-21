const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// APIキーとURLの設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const CUSTOM_API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

// カスタムヘッダー付きのSupabaseクライアントを作成
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
        headers: {
            'x-api-key': CUSTOM_API_KEY
        }
    }
});

async function getToyotaMarkdown() {
    console.log('🔍 カスタムAPIキーでトヨタ自動車のMarkdownファイルを検索中...');
    console.log('API Key:', CUSTOM_API_KEY.substring(0, 30) + '...');

    try {
        // 1. まずトヨタ自動車のメタデータを検索
        console.log('\n📊 トヨタ自動車のファイル情報を検索中...');
        const { data: files, error: searchError } = await supabase
            .from('markdown_files_metadata')
            .select('*')
            .or('company_name.ilike.%トヨタ自動車%,company_name.ilike.%TOYOTA%')
            .limit(10);

        if (searchError) {
            console.error('❌ 検索エラー:', searchError.message);
            return;
        }

        if (!files || files.length === 0) {
            console.log('⚠️ トヨタ自動車のファイルが見つかりません');

            // 全企業リストを表示して確認
            console.log('\n📋 利用可能な企業リストを確認中...');
            const { data: allCompanies, error: listError } = await supabase
                .from('markdown_files_metadata')
                .select('company_id, company_name, fiscal_year')
                .limit(20);

            if (!listError && allCompanies) {
                console.log('\n利用可能な企業（サンプル）:');
                const uniqueCompanies = new Map();
                allCompanies.forEach(c => {
                    const key = `${c.company_id}_${c.company_name}`;
                    if (!uniqueCompanies.has(key)) {
                        uniqueCompanies.set(key, c);
                    }
                });

                Array.from(uniqueCompanies.values()).slice(0, 10).forEach((company, i) => {
                    console.log(`${i + 1}. ${company.company_name || company.company_id} (${company.fiscal_year})`);
                });
            }
            return;
        }

        console.log(`\n✅ ${files.length}件のトヨタ自動車ファイルが見つかりました！`);

        // ファイル情報を表示
        files.forEach((file, index) => {
            console.log(`\n${index + 1}. ${file.company_name || file.company_id}`);
            console.log(`   - 年度: ${file.fiscal_year}`);
            console.log(`   - 文書タイプ: ${file.file_type}`);
            console.log(`   - ファイル名: ${file.file_name}`);
            console.log(`   - ストレージパス: ${file.storage_path}`);
        });

        // 2. 最初のファイルの内容を取得
        if (files.length > 0) {
            const targetFile = files[0];
            console.log(`\n📥 ファイルをダウンロード中: ${targetFile.storage_path}`);

            // storage_pathから'markdown-files/'プレフィックスを削除
            const cleanPath = targetFile.storage_path.replace('markdown-files/', '');
            const { data: fileContent, error: downloadError } = await supabase
                .storage
                .from('markdown-files')
                .download(cleanPath);

            if (downloadError) {
                console.error('❌ ダウンロードエラー:', downloadError.message);

                // パブリックURLから直接取得を試みる
                console.log('\n🔗 パブリックURLからの取得を試みます...');
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/markdown-files/${cleanPath}`;
                console.log('URL:', publicUrl);

                const response = await fetch(publicUrl, {
                    headers: {
                        'x-api-key': CUSTOM_API_KEY
                    }
                });

                if (response.ok) {
                    const content = await response.text();
                    console.log('\n✅ ファイル取得成功！');
                    console.log('ファイルサイズ:', content.length, 'バイト');
                    console.log('\n--- ファイルの最初の500文字 ---');
                    console.log(content.substring(0, 500));
                    console.log('...\n');

                    // ファイルを保存
                    const outputPath = path.join(__dirname, `toyota_${targetFile.fiscal_year}_${targetFile.file_type}.md`);
                    fs.writeFileSync(outputPath, content, 'utf8');
                    console.log(`💾 ファイルを保存しました: ${outputPath}`);
                } else {
                    console.error('❌ 取得失敗:', response.status, response.statusText);
                }
            } else {
                // Blobをテキストに変換
                const content = await fileContent.text();
                console.log('\n✅ ファイル取得成功！');
                console.log('ファイルサイズ:', content.length, 'バイト');
                console.log('\n--- ファイルの最初の500文字 ---');
                console.log(content.substring(0, 500));
                console.log('...\n');

                // ファイルを保存
                const outputPath = path.join(__dirname, `toyota_${targetFile.fiscal_year}_${targetFile.file_type}.md`);
                fs.writeFileSync(outputPath, content, 'utf8');
                console.log(`💾 ファイルを保存しました: ${outputPath}`);
            }
        }

    } catch (error) {
        console.error('💥 予期しないエラー:', error);
    }
}

// 実行
getToyotaMarkdown().then(() => {
    console.log('\n✨ 処理完了');
    process.exit(0);
}).catch(err => {
    console.error('❌ 処理失敗:', err);
    process.exit(1);
});