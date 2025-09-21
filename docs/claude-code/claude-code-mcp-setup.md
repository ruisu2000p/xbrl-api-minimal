# Claude CodeでXBRL-Financial MCPを設定する方法

## 概要
Claude CodeでもXBRL財務データMCPサーバーを使用できるように設定します。

## 現在のMCP設定状況

### 利用可能なMCPツール：
- ✅ `mcp__xbrl-financial__search-companies` - 企業検索
- ✅ `mcp__xbrl-financial__query-my-data` - データクエリ
- ⚠️ `mcp__xbrl-financial__get-storage-md` - ストレージアクセス（APIキー必要）

## 設定ファイルの場所

### Windows
- Claude Desktop: `C:\Users\pumpk\.claude.json`
- Claude Code: 同じファイルを共有、または独自の設定ファイル

## 必要な設定更新

### 1. MCPサーバー設定（.claude.jsonまたは設定ファイル）

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "--loglevel=error",
        "shared-supabase-mcp-minimal@2.1.0"
      ],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_ANON_KEY": "<your-jwt-token-here>"
      }
    }
  }
}
```

### 2. NPMパッケージ情報

- **パッケージ名**: `shared-supabase-mcp-minimal`
- **最新バージョン**: `2.1.0`
- **NPM URL**: https://www.npmjs.com/package/shared-supabase-mcp-minimal
- **作者**: ruisu2000

## 環境変数の説明

| 変数名 | 説明 | 必須 |
|--------|------|------|
| SUPABASE_URL | SupabaseプロジェクトのURL | ✅ |
| SUPABASE_ANON_KEY | Supabaseの公開APIキー（anon key） | ✅ |

⚠️ **重要**: Service Role Keyは絶対に設定しないでください。セキュリティリスクがあります。

## 動作確認方法

### 1. 企業検索テスト
```typescript
// MCPツールを使用
mcp__xbrl-financial__search-companies({
  query: "トヨタ",
  limit: 5
})
```

### 2. メタデータ取得テスト
```typescript
mcp__xbrl-financial__query-my-data({
  table: "companies",
  filters: {"ticker_code": {"$eq": "7203"}},
  limit: 1
})
```

### 3. ドキュメント取得テスト
```typescript
mcp__xbrl-financial__get-storage-md({
  storage_path: "path/to/document.md",
  max_bytes: 5000
})
```

## トラブルシューティング

### エラー: "Storage error"
- **原因**: APIキーが設定されていない、またはストレージパスが正しくない
- **解決**: 環境変数を確認し、正しいパスを指定

### エラー: "Cannot find module"
- **原因**: NPMパッケージがインストールされていない
- **解決**: `npx shared-supabase-mcp-minimal@2.1.0`を実行

## セキュリティ注意事項

1. **anon keyのみ使用** - 公開用のキーなので安全
2. **Service Role Keyは使用しない** - 管理者権限があるため危険
3. **環境変数は.env.localに保存** - Gitにコミットしない

## 関連リンク

- [Supabaseプロジェクト](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx)
- [NPMパッケージ](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
- [GitHub リポジトリ](https://github.com/ruisu2000p/xbrl-api-minimal)

## 更新履歴

- 2025-01-14: 初版作成
- バージョン1.8.1から2.1.0へ更新
- 環境変数の追加