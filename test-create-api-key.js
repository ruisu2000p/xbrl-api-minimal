// APIキー xbrl_v1_3498974e5a029c0a0f47e9c18847a417 をapi_keysテーブルに登録
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createApiKey() {
  const apiKey = 'xbrl_v1_3498974e5a029c0a0f47e9c18847a417';

  try {
    // SHA256ハッシュを生成
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    console.log('Creating API key in database...');
    console.log('API Key:', apiKey);
    console.log('Key Hash:', keyHash);
    console.log('Key Prefix:', 'xbrl_v1');
    console.log('Key Suffix:', '7a417');

    // api_keysテーブルにキーを挿入
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        id: crypto.randomUUID(),
        key_hash: keyHash,
        key_prefix: 'xbrl_v1',
        key_suffix: '7a417',
        masked_key: 'xbrl_v1_*****7a417',
        name: 'XBRL Financial API Key',
        description: 'API key for XBRL financial data access',
        status: 'active',
        is_active: true,
        tier: 'basic',
        environment: 'production',
        version: 1,
        permissions: {
          read_data: true,
          write_data: false
        },
        metadata: {
          created_for: 'xbrl-financial-mcp',
          purpose: 'Financial data access'
        },
        rate_limit_per_minute: 100,
        rate_limit_per_hour: 1000,
        rate_limit_per_day: 10000,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating API key:', error);
    } else {
      console.log('\n✓ API key created successfully!');
      console.log('Record:', JSON.stringify(data, null, 2));
    }

    // 作成したキーを確認
    const { data: verifyData, error: verifyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash);

    if (verifyError) {
      console.error('Error verifying API key:', verifyError);
    } else {
      console.log('\n✓ API key verification:');
      console.log(JSON.stringify(verifyData, null, 2));
    }

    // verify_api_key_hash関数でテスト
    const { data: funcData, error: funcError } = await supabase
      .rpc('verify_api_key_hash', { p_api_key: apiKey });

    if (funcError) {
      console.error('\nError testing verify_api_key_hash:', funcError);
    } else {
      console.log('\n✓ verify_api_key_hash function test:');
      console.log(JSON.stringify(funcData, null, 2));
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createApiKey();