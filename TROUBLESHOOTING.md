# セッション保持問題のトラブルシューティング

## 問題の症状
- ユーザー登録後、「認証済みユーザー」と表示されるが、すぐに「未認証」になる
- localStorageが空（`sb-*`キーが存在しない）
- Cookieは設定されているがセッションが復元されない

## 確認手順

### 1. Supabase側の設定確認

#### Authentication URLs
1. Supabaseダッシュボードにログイン
2. Authentication → URL Configuration に移動
3. 以下を確認：
   - Site URL: `https://xbrl-api-minimal.vercel.app`
   - Redirect URLs に本番URLが含まれているか

#### JWT設定
1. Settings → Auth に移動
2. 以下を確認：
   - JWT Expiry: 3600秒以上
   - Enable automatic reuse detection: ON
   - Refresh Token Rotation: Enabled

### 2. ブラウザでのデバッグ

#### Developer Toolsでの確認
```javascript
// Consoleで実行
// 1. localStorageの確認
Object.keys(localStorage).filter(k => k.includes('sb-'))

// 2. sessionStorageの確認
Object.keys(sessionStorage).filter(k => k.includes('sb-'))

// 3. Cookieの確認
document.cookie.split(';').filter(c => c.includes('sb-'))

// 4. Supabaseクライアントの状態確認
const supabase = window.__xbrlSupabaseClient
if (supabase) {
  supabase.auth.getSession().then(({data, error}) => {
    console.log('Session:', data?.session)
    console.log('Error:', error)
  })
}
```

### 3. Supabase Logsの確認

1. Supabaseダッシュボード → Logs → Auth に移動
2. 最近のエラーログを確認
3. 特に以下のエラーに注意：
   - `invalid_grant`
   - `refresh_token_not_found`
   - CORS関連のエラー

### 4. ネットワークタブでの確認

1. Developer Tools → Network タブを開く
2. 以下のリクエストを確認：
   - `/auth/v1/token` - トークンリフレッシュ
   - `/auth/v1/user` - ユーザー情報取得
   - `/api/auth/sync` - Cookie同期

### 5. Vercel Functions Logsの確認

```bash
# Vercel CLIがインストールされている場合
vercel logs --follow

# またはVercelダッシュボードから
# Functions → Logs で確認
```

## 解決策

### 方法1: Supabase URLの再設定
1. Supabaseダッシュボード → Authentication → URL Configuration
2. Site URLとRedirect URLsを再設定
3. 変更を保存して5分待つ（キャッシュクリアのため）

### 方法2: 新しいユーザーでテスト
1. Supabaseダッシュボード → Authentication → Users
2. 新しいテストユーザーを作成
3. そのユーザーでログインテスト

### 方法3: localStorage/Cookieのクリア
```javascript
// 完全にクリーンな状態でテスト
Object.keys(localStorage).forEach(k => {
  if (k.includes('sb-')) localStorage.removeItem(k)
})
document.cookie.split(';').forEach(c => {
  if (c.includes('sb-')) {
    const name = c.split('=')[0].trim()
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }
})
location.reload()
```

### 方法4: Supabase Clientの再初期化
```javascript
// app/lib/infrastructure/supabase-manager.ts の確認
// storageKeyとcookieOptionsが正しく設定されているか
const projectRef = url.match(/https:\/\/([^.]+)/)?.[1]
const storageKey = `sb-${projectRef}-auth-token`
```

## 根本原因の可能性

1. **Supabase Project URLの不一致**
   - 環境変数のURLとSupabaseダッシュボードの設定が一致していない

2. **CORS設定**
   - Vercelのドメインが許可されていない

3. **Cookie設定の問題**
   - SameSite/Secure属性の設定ミス
   - ドメインの不一致

4. **トークンの有効期限**
   - JWTの有効期限が短すぎる
   - リフレッシュトークンが正しく処理されていない

## 確認用SQLクエリ

```sql
-- Supabase SQL Editorで実行

-- 1. 最近のユーザー登録を確認
SELECT id, email, created_at, last_sign_in_at, confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. プロファイルの作成状態を確認
SELECT p.*, u.email
FROM private.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 3. APIキーの状態を確認
SELECT id, user_id, masked_key, is_active, created_at
FROM private.api_keys_main
ORDER BY created_at DESC
LIMIT 5;

-- 4. セッション関連のメタデータを確認
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'your-test-email@example.com';
```

## 連絡先とリソース

- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase統合ガイド](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Vercel環境変数ガイド](https://vercel.com/docs/environment-variables)