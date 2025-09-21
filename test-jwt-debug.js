/**
 * JWT認証デバッグテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function debugTest() {
    console.log('🔍 JWT認証デバッグテスト');
    console.log('=' .repeat(60));
    console.log('テスト時刻:', new Date().toISOString());
    console.log('APIキー:', API_KEY);
    console.log('');

    try {
        // 1. 認証なしでアクセス（環境変数チェック）
        console.log('1️⃣ 認証なしでアクセス:');
        const noAuthRes = await fetch(GATEWAY_URL);
        const noAuthStatus = noAuthRes.status;
        const noAuthBody = await noAuthRes.text();

        console.log('   ステータス:', noAuthStatus);
        console.log('   レスポンス:', noAuthBody);

        try {
            const jsonData = JSON.parse(noAuthBody);
            if (jsonData.debug) {
                console.log('   デバッグ情報:', jsonData.debug);
            }
        } catch {}

        // 2. APIキーでアクセス
        console.log('\n2️⃣ APIキーでアクセス:');
        const authRes = await fetch(GATEWAY_URL, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        const authStatus = authRes.status;
        const authBody = await authRes.text();

        console.log('   ステータス:', authStatus);
        console.log('   レスポンス:', authBody);

        try {
            const jsonData = JSON.parse(authBody);
            if (jsonData.debug) {
                console.log('   デバッグ情報:', jsonData.debug);
            }
        } catch {}

        // 3. 分析
        console.log('\n📊 分析結果:');
        if (noAuthBody.includes('JWT_SECRET not configured')) {
            console.log('   ❌ JWT_SECRET環境変数が設定されていません');
            console.log('   → Supabaseダッシュボードで設定を確認してください');
        } else if (authBody.includes('JWT generation failed')) {
            console.log('   ❌ JWT生成に失敗しました');
            console.log('   → APIキーまたはJWT Secretの形式に問題がある可能性');
        } else if (authStatus === 200) {
            console.log('   ✅ JWT認証システムが正常に動作しています');
        } else {
            console.log('   ⚠️ 予期しないエラーが発生しています');
        }

    } catch (error) {
        console.error('\n❌ リクエストエラー:', error.message);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('デバッグテスト完了');
}

debugTest();