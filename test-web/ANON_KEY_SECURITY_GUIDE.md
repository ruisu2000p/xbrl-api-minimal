# XBRL API - Anon Key セキュリティガイド

## 🔑 Anon Key について

### 基本概念
- **Anon Key** は**公開可能**なキーです
- クライアントアプリ（Web/モバイル）に埋め込む前提の公開キー
- 第三者に見られても想定内の設計
- 権限は `anon` ロールに限定されます

### 重要な原則
**Anon Key自体では保護されません。RLS（Row Level Security）と権限設計で守ります。**

## ✅ 共有可能なキー

### Anon Key（公開キー）
```javascript
// このキーは公開可能
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';
```

**できること：**
- anonロールの権限範囲内でのAPIアクセス
- RLSポリシーで許可された操作のみ
- 公開データの読み取り

## ❌ 絶対に共有してはいけないキー

### Service Role Key（管理者キー）
```javascript
// このキーは絶対に公開しない！
// const SERVICE_ROLE_KEY = 'eyJ...'; // RLSをバイパスするため危険
```

**危険性：**
- RLSをバイパスして全データにアクセス可能
- データの削除・変更が無制限に可能
- サーバー側のみで使用

## 🛡️ 安全に使うためのチェックリスト

### 1. RLS（Row Level Security）
- [x] すべてのテーブルでRLS有効化
- [x] 適切なポリシー設定（TO anon / TO authenticated）
- [x] `markdown_files_metadata`テーブル：読み取り専用
- [x] `api_keys`テーブル：anonアクセス不可

### 2. 権限管理
- [x] anonに不要なテーブル/関数の権限を付与しない
- [x] 必要最小限のGRANTのみ
- [x] 危険な操作は認証ユーザーのみ

### 3. Edge Functions
- [x] `markdown-reader`：公開データ読み取りのみ（anon OK）
- [x] `gateway-simple`：独自APIキー認証が必要
- [x] 重要な操作はEdge Function経由で制御

### 4. Storage
- [x] バケットごとにポリシー設定
- [x] `markdown-files`：公開読み取り可
- [x] アップロードは認証必須

### 5. レート制限・悪用対策
- [x] Edge Functionでレート制限実装
- [x] 独自APIキーシステムで使用量管理
- [x] ティア別アクセス制御（Free/Basic）

### 6. 環境分離
- [x] 本番/開発でキーを分ける
- [x] 問題時はSupabaseダッシュボードから再生成可能

## 📊 現在の実装状況

### テーブル別RLS設定

| テーブル | RLS | anonアクセス | 備考 |
|---------|-----|-------------|------|
| markdown_files_metadata | ✅ 有効 | 読み取りのみ | 公開データ |
| company_master | ✅ 有効 | 読み取りのみ | 企業マスター |
| api_keys | ✅ 有効 | ❌ 不可 | Service Roleのみ |
| api_key_usage_logs | ✅ 有効 | ❌ 不可 | ログ記録 |

### Edge Functions権限

| Function | anonアクセス | 認証方式 | 用途 |
|----------|-------------|---------|------|
| markdown-reader | ✅ 可能 | Anon Key | 公開データ取得 |
| gateway-simple | ⚠️ 制限付き | 独自APIキー | API管理 |
| xbrl-search | ❌ 不可 | 独自APIキー | 検索機能 |

## 🚀 実装例

### クライアント側（公開可能）
```javascript
// Webアプリやモバイルアプリに埋め込んでOK
const supabase = createClient(
  'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  ANON_KEY  // 公開キー
);

// RLSで保護されたデータアクセス
const { data, error } = await supabase
  .from('markdown_files_metadata')
  .select('*')
  .eq('fiscal_year', 'FY2024');
```

### サーバー側（非公開）
```javascript
// Node.js バックエンドなど、サーバー側でのみ使用
const supabase = createClient(
  SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY,  // 環境変数から取得
  { auth: { autoRefreshToken: false } }
);

// 管理者操作（APIキー生成など）
const { data, error } = await supabase
  .from('api_keys')
  .insert({ /* ... */ });
```

## 📝 まとめ

1. **Anon Keyは公開して大丈夫** - クライアントアプリに埋め込んでOK
2. **Service Role Keyは絶対に公開しない** - サーバー側のみで使用
3. **RLSと権限設計が最重要** - これが実質的なセキュリティ
4. **独自APIキーシステム** - 第三者向けには独自キーを発行
5. **Edge Functions** - 複雑な認証や制御が必要な場合に使用

## 🔗 関連ドキュメント

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Security](https://supabase.com/docs/guides/functions/auth)
- [API Key Management Best Practices](https://supabase.com/docs/guides/api#api-url-and-keys)

---
最終更新: 2025年1月21日