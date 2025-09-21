#!/usr/bin/env node

const https = require('https');

// API設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('エラー: SUPABASE_SERVICE_KEY環境変数が設定されていません');
  console.log('以下のコマンドで設定してください:');
  console.log('SET SUPABASE_SERVICE_KEY=your_service_role_key_here');
  process.exit(1);
}

function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1${endpoint}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testApiKeyCreation() {
  console.log('=================================================');
  console.log('APIキー作成テスト');
  console.log('=================================================\n');

  try {
    // Step 1: ユーザーを確認
    console.log('【ステップ1】ユーザー情報の確認');
    console.log('-------------------------------------------------');

    const usersResponse = await makeRequest('/users?email=eq.test_new_user@example.com');

    if (usersResponse.ok) {
      const users = JSON.parse(usersResponse.data);
      if (users.length > 0) {
        const user = users[0];
        console.log('✅ ユーザー確認成功');
        console.log('  • ユーザーID:', user.id);
        console.log('  • メールアドレス:', user.email);
        console.log('  • 作成日時:', user.created_at);

        // Step 2: APIキーを作成
        console.log('\n【ステップ2】APIキーの作成');
        console.log('-------------------------------------------------');

        const apiKeyData = {
          user_id: user.id,
          key_name: 'Test API Key (Direct)',
          tier: 'free',
          is_active: true,
          permissions: {
            read: true,
            write: false
          }
        };

        const createResponse = await makeRequest('/api_keys', 'POST', apiKeyData);

        if (createResponse.ok) {
          const apiKey = JSON.parse(createResponse.data);
          console.log('✅ APIキー作成成功！');
          console.log('  • キーID:', apiKey[0]?.id || apiKey.id);
          console.log('  • キー名:', apiKey[0]?.key_name || apiKey.key_name);
          console.log('  • ティア:', apiKey[0]?.tier || apiKey.tier);
          console.log('  • ステータス:', apiKey[0]?.is_active || apiKey.is_active ? 'アクティブ' : '非アクティブ');
        } else {
          console.log('❌ APIキー作成失敗:', createResponse.status);
          console.log('レスポンス:', createResponse.data);
        }

        // Step 3: 作成されたAPIキーを確認
        console.log('\n【ステップ3】作成されたAPIキーの確認');
        console.log('-------------------------------------------------');

        const keysResponse = await makeRequest(`/api_keys?user_id=eq.${user.id}`);

        if (keysResponse.ok) {
          const keys = JSON.parse(keysResponse.data);
          console.log('✅ APIキー一覧取得成功');
          console.log('  • キー数:', keys.length);

          if (keys.length > 0) {
            console.log('\nAPIキー一覧:');
            keys.forEach(key => {
              console.log(`  - ${key.key_name} (${key.tier}) - ${key.is_active ? 'アクティブ' : '非アクティブ'}`);
            });
          }
        } else {
          console.log('❌ APIキー一覧取得失敗:', keysResponse.status);
        }

      } else {
        console.log('❌ ユーザーが見つかりません: test_new_user@example.com');
      }
    } else {
      console.log('❌ ユーザー確認失敗:', usersResponse.status);
      console.log('レスポンス:', usersResponse.data);
    }

  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n=================================================');
  console.log('テスト完了');
  console.log('=================================================');
}

// 実行
testApiKeyCreation();