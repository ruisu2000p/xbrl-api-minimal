/**
 * ローカルでbcrypt検証テスト
 */

const bcrypt = require('bcryptjs');

const apiKey = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const storedHash = '$2b$06$BcFxerQm5kyt5vKX37qc.eibyVfooi5SMcvo/Wwa7dh5RdYldYZwK';

async function testBcrypt() {
    console.log('🔐 bcryptローカル検証テスト\n');

    console.log('APIキー:', apiKey);
    console.log('ハッシュ値:', storedHash);
    console.log('');

    try {
        const result = await bcrypt.compare(apiKey, storedHash);
        console.log('検証結果:', result ? '✅ 成功' : '❌ 失敗');

        // 新しいハッシュも生成してみる
        console.log('\n🔧 新しいハッシュ生成:');
        const newHash = await bcrypt.hash(apiKey, 6);
        console.log('新ハッシュ:', newHash);

        const newResult = await bcrypt.compare(apiKey, newHash);
        console.log('新ハッシュ検証:', newResult ? '✅ 成功' : '❌ 失敗');

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

testBcrypt();