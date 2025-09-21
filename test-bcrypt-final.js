const bcrypt = require('bcryptjs');

const apiKey = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const storedHash = '$2b$06$BcFxerQm5kyt5vKX37qc.eibyVfooi5SMcvo/Wwa7dh5RdYldYZwK';

async function test() {
    console.log('APIキー:', apiKey);
    console.log('保存されているハッシュ:', storedHash);
    console.log('\n検証中...');

    const isValid = await bcrypt.compare(apiKey, storedHash);
    console.log('結果:', isValid ? '✅ 一致' : '❌ 不一致');

    // 新しくハッシュを生成
    console.log('\n新しいハッシュを生成中...');
    const newHash = await bcrypt.hash(apiKey, 6);
    console.log('新しいハッシュ:', newHash);

    const isValidNew = await bcrypt.compare(apiKey, newHash);
    console.log('新ハッシュでの検証:', isValidNew ? '✅ 一致' : '❌ 不一致');
}

test();