const crypto = require('crypto');

// Test API key
const apiKey = 'xbrl_live_cHi3JVb6waLQ4WEqY7v3OzlkEN8K8iMF';

// Secret from environment (you need to set this)
const secret = process.env.API_KEY_SECRET || 'test-secret-key-minimum-32-chars-for-testing';

// Hash the API key
const hash = crypto.createHmac('sha256', secret).update(apiKey).digest('hex');

console.log('API Key:', apiKey);
console.log('Secret:', secret);
console.log('Hash:', hash);

// Test with the actual secret from Vercel environment
console.log('\nTo verify in Supabase SQL:');
console.log(`SELECT * FROM api_keys WHERE key_hash = '${hash}';`);