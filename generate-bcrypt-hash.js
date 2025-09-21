const bcrypt = require('bcryptjs');

// APIキー
const apiKeys = [
    'xbrl_v1_8b46fafbde00356ab72577e9eeba2709',
    'xbrl_v1_ead23e30246d88250fdf4423c1e1491d'
];

async function generateHashes() {
    console.log('🔐 BCryptハッシュ生成\n');

    for (const apiKey of apiKeys) {
        // bcryptでハッシュ化（salt rounds: 6）
        const hash = await bcrypt.hash(apiKey, 6);

        console.log(`APIキー: ${apiKey}`);
        console.log(`ハッシュ: ${hash}`);

        // 検証テスト
        const isValid = await bcrypt.compare(apiKey, hash);
        console.log(`検証: ${isValid ? '✅ 成功' : '❌ 失敗'}\n`);
    }
}

// bcryptjsがない場合はインストール
try {
    require.resolve('bcryptjs');
    generateHashes();
} catch(e) {
    console.log('📦 bcryptjsをインストール中...');
    require('child_process').execSync('npm install bcryptjs', {stdio: 'inherit'});
    generateHashes();
}