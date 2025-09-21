// 環境変数確認用テストスクリプト
console.log('Environment variables:');
console.log('XBRL_API_URL:', process.env.XBRL_API_URL);
console.log('XBRL_API_KEY:', process.env.XBRL_API_KEY);
console.log('GATEWAY_URL:', process.env.GATEWAY_URL);
console.log('CLIENT_API_KEY:', process.env.CLIENT_API_KEY);

// 環境変数が設定されているかチェック
const hasXBRLURL = !!process.env.XBRL_API_URL;
const hasXBRLKey = !!process.env.XBRL_API_KEY;

console.log('\nEnvironment check:');
console.log('XBRL_API_URL set:', hasXBRLURL);
console.log('XBRL_API_KEY set:', hasXBRLKey);

if (hasXBRLURL && hasXBRLKey) {
    console.log('\n✅ Environment variables are correctly set for Gateway mode!');
} else {
    console.log('\n❌ Missing required environment variables');
}