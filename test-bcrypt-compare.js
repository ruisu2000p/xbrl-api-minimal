const bcrypt = require('bcryptjs');

// テストするAPIキー
const apiKey = 'xbrl_v1_8b46fafbde00356ab72577e9eeba2709';

// データベースに登録されているハッシュ
const registeredHash = '$2b$06$DRMvklXYKUN0TxfbldMwS.CTLejzTTIvWI595wsUTT8850cR2EZ4q';

async function testBcryptCompare() {
    console.log('🔍 bcryptハッシュ検証テスト\n');
    console.log('APIキー:', apiKey);
    console.log('登録済みハッシュ:', registeredHash);
    console.log('\n検証中...');

    try {
        // 登録済みハッシュと比較
        const isValid = await bcrypt.compare(apiKey, registeredHash);
        console.log('結果:', isValid ? '✅ 一致' : '❌ 不一致');

        // 新しくハッシュを生成して確認
        console.log('\n新しいハッシュを生成中...');
        const newHash = await bcrypt.hash(apiKey, 6);
        console.log('新しいハッシュ:', newHash);

        // 新しいハッシュでも検証
        const isValidNew = await bcrypt.compare(apiKey, newHash);
        console.log('新ハッシュ検証:', isValidNew ? '✅ 一致' : '❌ 不一致');

    } catch (error) {
        console.error('エラー:', error);
    }
}

testBcryptCompare();