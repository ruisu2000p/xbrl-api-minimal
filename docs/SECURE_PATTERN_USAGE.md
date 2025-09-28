# 安全な構成パターン使用ガイド

## 概要

すべてのセンシティブなデータは`private`スキーマに保存し、フロントエンドからは以下の方法でのみアクセスします：

1. **読み取り専用** → VIEWを通じてRLSで制御
2. **更新処理** → RPC関数（SECURITY DEFINER）を使用
3. **複雑な処理** → Edge Functions（必要時のみ）

## 基本原則

- ❌ **やってはいけないこと**
  - クライアントから`user_id`を渡す
  - privateスキーマに直接アクセス
  - センシティブな情報をpublicスキーマに置く

- ✅ **やるべきこと**
  - 常に`auth.uid()`で本人確認
  - 必要最小限の列のみVIEWで公開
  - ビジネスロジックはRPC関数に集約

## 実装例

### 1. プロファイルの取得と更新

```typescript
// app/(protected)/dashboard/page.tsx
import { getMyProfile, updateMyProfile } from '@/lib/supabase/rpc-client'

export default function ProfilePage() {
  // プロファイル取得
  const loadProfile = async () => {
    const result = await getMyProfile()
    if (result.success) {
      console.log('Profile:', result.data)
    }
  }

  // プロファイル更新
  const handleUpdate = async () => {
    const result = await updateMyProfile({
      full_name: 'John Doe',
      username: 'johndoe'
    })
    if (result.success) {
      console.log('Updated:', result.data)
    }
  }
}
```

### 2. APIキーの管理

```typescript
// app/(protected)/settings/api-keys/page.tsx
import { getMyApiKeys, generateApiKey, revokeApiKey } from '@/lib/supabase/rpc-client'

export default function ApiKeysPage() {
  // APIキー一覧取得
  const loadApiKeys = async () => {
    const result = await getMyApiKeys()
    if (result.success) {
      console.log('API Keys:', result.data)
      // data は配列: [{ id, name, masked_key, tier, ... }]
    }
  }

  // 新規APIキー生成
  const handleGenerate = async () => {
    const result = await generateApiKey('Production Key', 'premium')
    if (result.success) {
      // 初回のみ平文のapi_keyが返される！
      alert(`保存してください: ${result.data.api_key}`)
      // 二度と取得できないので、ユーザーに保存を促す
    }
  }

  // APIキー無効化
  const handleRevoke = async (keyId: string) => {
    const result = await revokeApiKey(keyId)
    if (result.success) {
      console.log('Revoked successfully')
    }
  }
}
```

### 3. Server Components での使用

```typescript
// app/(protected)/dashboard/page.tsx (Server Component)
import { getMyProfileServer, getMyApiKeysServer } from '@/lib/supabase/rpc-client'

export default async function DashboardPage() {
  // サーバーサイドでデータ取得
  const profile = await getMyProfileServer()
  const apiKeys = await getMyApiKeysServer()

  if (!profile.success) {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <h1>Welcome, {profile.data.full_name}</h1>
      <p>Plan: {profile.data.plan}</p>
      {apiKeys.success && (
        <p>Active API Keys: {apiKeys.data.length}</p>
      )}
    </div>
  )
}
```

## SQLマイグレーション適用方法

### Supabase Dashboard から適用

1. Supabase Dashboard → SQL Editor
2. `20250129_secure_pattern_implementation.sql` の内容をコピー
3. 実行

### Supabase CLI から適用（推奨）

```bash
# 開発環境でテスト
supabase db push

# 本番環境に適用
supabase db push --db-url "postgresql://..."
```

## セキュリティチェックリスト

### ✅ 実装済み

- [ ] すべてのテーブルは`private`スキーマに配置
- [ ] 公開VIEWには必要最小限の列のみ
- [ ] RPC関数で`auth.uid()`による本人確認
- [ ] APIキーはbcryptでハッシュ化
- [ ] 平文キーは生成時の一度だけ返却

### 🔍 確認事項

- [ ] Supabase Dashboardで環境変数設定
- [ ] Authentication URLsの設定
- [ ] RLSが有効になっているか確認

## トラブルシューティング

### エラー: "not authenticated"

- 原因: セッションが切れている
- 解決: ログインし直す

### エラー: "function does not exist"

- 原因: SQLマイグレーションが未適用
- 解決: マイグレーションファイルを実行

### APIキーが機能しない

- 原因: verify_api_key_hash関数が正しく設定されていない
- 解決: `20250128_update_api_key_to_bcrypt.sql` を確認

## 参考リンク

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)