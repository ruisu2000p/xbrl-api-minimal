# プロジェクト整理計画

## 削除対象ファイル

### API重複ファイル（統合・削除対象）
- `app/api/v1/companies/route.prod.ts` (本番用は route.ts に統合)
- `app/api/v1/companies/supabase-route.ts` (route.ts に統合)
- `app/api/v1/companies/test/` (テスト用エンドポイント削除)
- `app/api/v1/companies/[id]/supabase-route.ts` (route.ts に統合)
- `app/api/v1/markdown-files-optimized/` (markdown-files に統合)
- `app/api/v1/markdown-mock/` (モックデータ削除)
- `app/api/v1/companies-files/` (companies/[id]/files に統合済み)

### 重複機能
- `app/api/v1/documents/` (markdown-documents と重複)
- `app/api/v1/financial-data/` (companies/[id]/data と重複)

### 認証関連の整理
- `app/api/auth/seed/` (シードデータ用、本番不要)
- `app/api/auth/login-fixed/` (login/route.ts に統合済み)

### テスト・デバッグ用
- `app/api/test-db/`
- `app/api/test-supabase/`
- `app/api/admin/test-connection/`

## 保持するファイル構造

```
app/api/v1/
├── companies/
│   ├── route.ts (一覧・検索)
│   └── [id]/
│       ├── route.ts (詳細)
│       ├── data/ (財務データ)
│       └── files/ (ファイル一覧)
├── markdown-documents/
│   └── route.ts (Markdownドキュメント検索)
├── apikeys/
│   ├── route.ts (APIキー管理)
│   └── [id]/route.ts
└── search/
    └── route.ts (全文検索)
```

## 設定ファイルの整理
- 重複する設定ファイル（claude_desktop_config*.json）を削除
- テンプレートファイルを1つに統合

## スクリプトの整理
- `scripts/` フォルダ内の未使用スクリプトを確認・削除