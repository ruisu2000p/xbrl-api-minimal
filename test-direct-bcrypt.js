const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testDirectly() {
    const apiKey = 'xbrl_v1_8b46fafbde00356ab72577e9eeba2709';

    console.log('🔍 直接データベースでAPIキーを検証\n');
    console.log('APIキー:', apiKey);

    // データベースから該当するレコードを取得
    const { data: apiKeys, error } = await supabase
        .from('api_keys')
        .select('id, name, key_hash, tier, is_active, status')
        .eq('masked_key', 'xbrl_v1_8b46****2709');

    if (error) {
        console.error('エラー:', error);
        return;
    }

    console.log(`\n見つかったレコード: ${apiKeys.length}件\n`);

    for (const key of apiKeys) {
        console.log(`ID: ${key.id}`);
        console.log(`名前: ${key.name}`);
        console.log(`ティア: ${key.tier}`);
        console.log(`アクティブ: ${key.is_active}`);
        console.log(`ステータス: ${key.status}`);
        console.log(`ハッシュ: ${key.key_hash.substring(0, 40)}...`);

        // bcryptで検証
        console.log('\nbcrypt検証中...');
        const isValid = await bcrypt.compare(apiKey, key.key_hash);
        console.log(`結果: ${isValid ? '✅ 一致' : '❌ 不一致'}`);
        console.log('-'.repeat(60));
    }
}

testDirectly().then(() => {
    console.log('\n✨ テスト完了');
    process.exit(0);
});