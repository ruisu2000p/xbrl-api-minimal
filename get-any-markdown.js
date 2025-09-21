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

// コマンドライン引数から企業名を取得
const searchTerm = process.argv[2] || 'ソニー';

async function getCompanyMarkdown(searchQuery) {
    console.log(`🔍 カスタムAPIキーで「${searchQuery}」のMarkdownファイルを検索中...`);
    console.log('API Key:', CUSTOM_API_KEY.substring(0, 30) + '...\n');

    try {
        // 企業のメタデータを検索
        const { data: files, error: searchError } = await supabase
            .from('markdown_files_metadata')
            .select('*')
            .or(`company_name.ilike.%${searchQuery}%,company_id.ilike.%${searchQuery}%`)
            .limit(5);

        if (searchError) {
            console.error('❌ 検索エラー:', searchError.message);
            return;
        }

        if (!files || files.length === 0) {
            console.log(`⚠️ 「${searchQuery}」のファイルが見つかりません\n`);

            // 利用可能な企業のサンプルを表示
            console.log('📋 利用可能な企業（サンプル）:\n');
            const { data: samples } = await supabase
                .from('markdown_files_metadata')
                .select('company_id, company_name, fiscal_year')
                .limit(10);

            if (samples) {
                const uniqueCompanies = new Map();
                samples.forEach(s => {
                    if (!uniqueCompanies.has(s.company_name)) {
                        uniqueCompanies.set(s.company_name, s);
                    }
                });

                Array.from(uniqueCompanies.values()).forEach((company, i) => {
                    console.log(`${i + 1}. ${company.company_name} (${company.fiscal_year})`);
                });
            }
            return;
        }

        console.log(`✅ ${files.length}件のファイルが見つかりました！\n`);

        // ファイル情報を表示
        files.forEach((file, index) => {
            console.log(`${index + 1}. ${file.company_name || file.company_id}`);
            console.log(`   年度: ${file.fiscal_year}`);
            console.log(`   文書: ${file.file_type}`);
            console.log(`   パス: ${file.storage_path}\n`);
        });

        // 最初のファイルをダウンロード
        const targetFile = files[0];
        console.log(`📥 ダウンロード中: ${targetFile.file_name}\n`);

        // storage_pathから'markdown-files/'プレフィックスを削除
        const cleanPath = targetFile.storage_path.replace('markdown-files/', '');
        const { data: fileContent, error: downloadError } = await supabase
            .storage
            .from('markdown-files')
            .download(cleanPath);

        if (downloadError) {
            console.error('❌ ダウンロードエラー:', downloadError.message);
            return;
        }

        // Blobをテキストに変換
        const content = await fileContent.text();
        console.log('✅ ファイル取得成功！');
        console.log(`サイズ: ${content.length} バイト\n`);
        console.log('--- ファイルの最初の300文字 ---');
        console.log(content.substring(0, 300));
        console.log('...\n');

        // ファイルを保存
        const safeName = searchQuery.replace(/[<>:"/\\|?*]/g, '_');
        const outputPath = path.join(__dirname, `${safeName}_${targetFile.fiscal_year}_${targetFile.file_type}.md`);
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`💾 保存先: ${outputPath}`);

    } catch (error) {
        console.error('💥 予期しないエラー:', error);
    }
}

// 実行
getCompanyMarkdown(searchTerm).then(() => {
    console.log('\n✨ 処理完了');
    process.exit(0);
}).catch(err => {
    console.error('❌ 処理失敗:', err);
    process.exit(1);
});