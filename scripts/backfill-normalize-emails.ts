/**
 * 既存メールアドレスの完全正規化バックフィルスクリプト
 *
 * 実行方法:
 * npx tsx scripts/backfill-normalize-emails.ts
 *
 * 処理内容:
 * - 既存のメールアドレスを normalizeEmail() で完全正規化
 * - Punycode変換、NFKC正規化、ゼロ幅文字除去などを適用
 * - 変更が必要なレコードのみ更新（差分更新）
 * - バッチ処理でパフォーマンス最適化
 */

import { createClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../utils/normalize-email'

const BATCH_SIZE = 100

async function main() {
  // 環境変数チェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('🚀 Starting email normalization backfill...\n')

  // すべてのプロフィールを取得
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ Failed to fetch profiles:', error)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ No profiles found with email addresses')
    return
  }

  console.log(`📊 Found ${profiles.length} profiles with email addresses\n`)

  // 正規化が必要なプロフィールを特定
  const needsNormalization: Array<{ id: string; oldEmail: string; newEmail: string }> = []

  for (const profile of profiles) {
    const normalized = normalizeEmail(profile.email)
    if (normalized !== profile.email) {
      needsNormalization.push({
        id: profile.id,
        oldEmail: profile.email,
        newEmail: normalized
      })
    }
  }

  console.log(`📝 Found ${needsNormalization.length} profiles needing normalization\n`)

  if (needsNormalization.length === 0) {
    console.log('✅ All email addresses are already normalized')
    return
  }

  // 変更内容のプレビュー（最初の10件）
  console.log('📋 Preview of changes (first 10):')
  needsNormalization.slice(0, 10).forEach(({ oldEmail, newEmail }, index) => {
    console.log(`   ${index + 1}. "${oldEmail}" → "${newEmail}"`)
  })
  if (needsNormalization.length > 10) {
    console.log(`   ... and ${needsNormalization.length - 10} more\n`)
  }

  // 確認プロンプト（本番環境では必須）
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Production environment detected!')
    console.log('⚠️  Please review changes carefully before proceeding.\n')

    // 実際の本番では readline などで対話的確認を追加
    console.log('💡 Set CONFIRM_BACKFILL=true to proceed')
    if (process.env.CONFIRM_BACKFILL !== 'true') {
      console.log('❌ Backfill cancelled (CONFIRM_BACKFILL not set)')
      process.exit(0)
    }
  }

  console.log('🔄 Starting batch updates...\n')

  // バッチ処理
  let updated = 0
  let failed = 0

  for (let i = 0; i < needsNormalization.length; i += BATCH_SIZE) {
    const batch = needsNormalization.slice(i, i + BATCH_SIZE)

    console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needsNormalization.length / BATCH_SIZE)}...`)

    // 各レコードを個別に更新（unique制約違反を個別に検出するため）
    for (const { id, oldEmail, newEmail } of batch) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', id)

      if (updateError) {
        console.error(`   ❌ Failed to update ${oldEmail}:`, updateError.message)
        failed++
      } else {
        updated++
      }
    }
  }

  console.log('\n✅ Backfill completed!')
  console.log(`   📊 Total processed: ${needsNormalization.length}`)
  console.log(`   ✅ Successfully updated: ${updated}`)
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`)
  }

  // 最終確認クエリ
  const { data: verification } = await supabase
    .from('profiles')
    .select('email')
    .not('email', 'is', null)
    .limit(1)

  if (verification && verification.length > 0) {
    const sample = verification[0].email
    const normalized = normalizeEmail(sample)
    if (sample === normalized) {
      console.log('\n✅ Verification: Sample email is normalized')
    } else {
      console.log('\n⚠️  Verification: Some emails may still need normalization')
    }
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
