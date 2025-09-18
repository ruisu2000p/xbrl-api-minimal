# XBRL Financial MCP 設定ガイド（公式版）

## 📦 パッケージ情報
- **NPM**: [shared-supabase-mcp-minimal](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
- **最新バージョン**: 2.1.0
- **GitHub**: [xbrl-api-minimal](https://github.com/ruisu2000p/xbrl-api-minimal)

## 🔧 正しいMCP設定

### 方法1: Supabase認証情報を直接使用（シンプル）

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU"
      }
    }
  }
}
```

### 方法2: APIキー認証（推奨・セキュア）

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "XBRL_API_KEY": "xbrl_fre_mfj56b8h_e626614251b1348e8392bd0985856619f868d4bd19e4d470",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

## 🔑 環境変数の説明

### 必須環境変数（方法1）
| 変数名 | 説明 | 値 |
|--------|------|-----|
| `SUPABASE_URL` | SupabaseプロジェクトURL | `https://wpwqxhyiglbtlaimrjrx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase公開APIキー | プロジェクトの公開キー |

### 必須環境変数（方法2）
| 変数名 | 説明 | 値 |
|--------|------|-----|
| `XBRL_API_KEY` | 発行されたAPIキー | `xbrl_fre_...` で始まるキー |
| `XBRL_API_URL` | APIエンドポイント | `https://xbrl-api-minimal.vercel.app/api/v1` |

## 📍 設定ファイルの場所

### Windows
```
C:\Users\[ユーザー名]\.claude.json
```

### Mac/Linux
```
~/.claude.json
```

## ✅ 設定手順

1. **APIキーの発行**（方法2の場合）
   - https://xbrl-api-minimal.vercel.app/dashboard
   - ログイン後、「APIキー管理」から新規発行

2. **設定ファイルの編集**
   ```bash
   # Windows
   notepad %USERPROFILE%\.claude.json

   # Mac/Linux
   nano ~/.claude.json
   ```

3. **設定の追加**
   - 上記のJSON設定をコピー
   - `mcpServers`セクションに貼り付け

4. **Claude Desktopの再起動**
   - 完全に終了してから再起動

## 🧪 動作確認

### 利用可能なMCPツール
- `mcp__xbrl-financial__search-companies` - 企業検索
- `mcp__xbrl-financial__query-my-data` - データクエリ
- `mcp__xbrl-financial__get-storage-md` - ドキュメント取得

### テストコマンド例
```javascript
// 企業検索
await mcp__xbrl-financial__search-companies({
  query: "トヨタ",
  limit: 5
});

// データ取得
await mcp__xbrl-financial__query-my-data({
  table: "companies",
  limit: 10
});
```

## ⚠️ トラブルシューティング

### エラー: "Storage error"
**原因**: 環境変数が正しく設定されていない
**解決**:
- `env`セクションが空でないか確認
- APIキーまたはSupabase認証情報を追加

### エラー: "Invalid API key"
**原因**: APIキーが無効または期限切れ
**解決**:
- ダッシュボードで新しいキーを発行
- キーが正しくコピーされているか確認

### エラー: "EPIPE: broken pipe"
**原因**: MCPサーバーとの通信エラー
**解決**:
- Claude Desktopを完全に再起動
- タスクマネージャーで残存プロセスを終了

## 🔒 セキュリティベストプラクティス

1. **APIキーの管理**
   - 90日ごとにローテーション
   - GitHubに公開しない
   - 使用状況を定期的に確認

2. **レート制限**
   - 100リクエスト/分の制限
   - 使用状況をモニタリング

3. **ログの確認**
   - `C:\Users\[ユーザー名]\AppData\Roaming\Claude\logs\`
   - エラーログを定期的にチェック

## 📊 機能一覧

- ✅ 5,220社の日本企業財務データ
- ✅ XBRLからMarkdown変換
- ✅ リアルタイムデータ更新
- ✅ Claude Desktop統合
- ✅ セキュアなAPI設計

## 🆘 サポート

- **GitHub Issues**: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- **NPM**: https://www.npmjs.com/package/shared-supabase-mcp-minimal
- **ダッシュボード**: https://xbrl-api-minimal.vercel.app/dashboard

---
*最終更新: 2025-01-14*
*バージョン: 2.1.0*