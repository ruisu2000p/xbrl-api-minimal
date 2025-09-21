/**
 * CORS Proxy Server for XBRL API Testing
 * ローカルテスト環境用のCORSプロキシサーバー
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';

const server = http.createServer((req, res) => {
    // CORSヘッダーを設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, X-Api-Key, x-api-key');

    // プリフライトリクエストへの応答
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`[Proxy] ${req.method} ${req.url}`);

    // リクエストパスからSupabase URLを構築
    const targetPath = req.url;
    const targetUrl = `${SUPABASE_URL}${targetPath}`;

    const parsedUrl = url.parse(targetUrl);

    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: req.method,
        headers: {
            ...req.headers,
            host: parsedUrl.hostname
        }
    };

    // Supabaseへのリクエストを転送
    const proxyReq = https.request(options, (proxyRes) => {
        console.log(`[Response] Status: ${proxyRes.statusCode}`);

        // レスポンスヘッダーを設定（CORSヘッダーも追加）
        res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Api-Key, x-api-key'
        });

        // レスポンスデータをパイプ
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
        console.error('[Error]', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    });

    // リクエストボディがある場合は転送
    req.pipe(proxyReq);
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('   CORS Proxy Server for XBRL API Testing');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ Proxy server running at http://localhost:${PORT}`);
    console.log(`📍 Forwarding to: ${SUPABASE_URL}`);
    console.log('');
    console.log('使用方法:');
    console.log(`  http://localhost:${PORT}/functions/v1/markdown-reader/by-company?name=...`);
    console.log('');
});