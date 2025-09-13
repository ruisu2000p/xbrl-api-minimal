// api_keysテーブルの構造と内容を確認するスクリプト

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkApiKeysTable() {
  console.log('=== API Keys Table Check ===\n')

  // 1. 既存のAPIキーを確認
  const { data: apiKeys, error: keysError } = await supabase
    .from('api_keys')
    .select('*')
    .limit(5)

  if (keysError) {
    console.error('Error fetching API keys:', keysError)
  } else {
    console.log('\nExisting API Keys (first 5):')
    if (apiKeys && apiKeys.length > 0) {
      // センシティブな情報を隠す
      const sanitized = apiKeys.map(key => ({
        id: key.id?.substring(0, 8) + '...',
        user_id: key.user_id?.substring(0, 8) + '...',
        name: key.name,
        created_at: key.created_at,
        is_active: key.is_active,
        status: key.status,
        tier: key.tier,
        key_hash: key.key_hash ? 'HASH_EXISTS' : 'NO_HASH',
        key_prefix: key.key_prefix,
        key_suffix: key.key_suffix
      }))
      console.table(sanitized)

      console.log('\nAll column names found:')
      console.log(Object.keys(apiKeys[0]).join(', '))
    } else {
      console.log('No API keys found in database')
    }
  }

  // 2. test.cookie@example.comユーザーのIDを確認
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('Error fetching users:', authError)
  } else {
    const testUser = authData.users.find(u => u.email === 'test.cookie@example.com')
    if (testUser) {
      console.log('\nTest user found:')
      console.log('ID:', testUser.id)
      console.log('Email:', testUser.email)
      console.log('Created:', testUser.created_at)

      // 3. このユーザーのAPIキーを確認
      const { data: userKeys, error: userKeysError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', testUser.id)

      if (userKeysError) {
        console.error('Error fetching user API keys:', userKeysError)
      } else {
        console.log(`\nAPI keys for test user: ${userKeys?.length || 0} found`)
        if (userKeys && userKeys.length > 0) {
          console.table(userKeys.map(k => ({
            id: k.id?.substring(0, 8) + '...',
            name: k.name,
            is_active: k.is_active,
            status: k.status,
            created_at: k.created_at
          })))
        }
      }
    } else {
      console.log('\nTest user not found')
    }
  }
}

checkApiKeysTable().catch(console.error)