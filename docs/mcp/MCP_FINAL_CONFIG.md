# XBRL Financial MCP - APIキー方式統一設定

## 🎯 唯一の公式設定方法

### Claude Desktop設定 (`.claude.json`)

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

## 📝 必要な環境変数（2つだけ）

| 環境変数 | 説明 | 例 |
|----------|------|-----|
| `XBRL_API_KEY` | 発行されたAPIキー | `xbrl_fre_mfj56b8h_...` |
| `XBRL_API_URL` | APIエンドポイント | `https://xbrl-api-minimal.vercel.app/api/v1` |

## 🚀 セットアップ手順

### 1. APIキーの発行
1. https://xbrl-api-minimal.vercel.app/dashboard にアクセス
2. Googleアカウントでログイン
3. 「APIキー管理」から新規発行
4. キーをコピー（`xbrl_fre_`で始まる文字列）

### 2. Claude Desktop設定
1. 設定ファイルを開く
   ```bash
   notepad %USERPROFILE%\.claude.json
   ```
2. `mcpServers`セクションに上記の設定を追加
3. APIキーを自分のキーに置き換え
4. ファイルを保存

### 3. Claude Desktop再起動
1. システムトレイからClaude Desktopを終了
2. タスクマネージャーで残存プロセス確認
3. Claude Desktopを起動

## ✅ 動作確認

MCPツールが使用可能になります：
- `mcp__xbrl-financial__search-companies` - 企業検索
- `mcp__xbrl-financial__query-my-data` - データクエリ
- `mcp__xbrl-financial__get-storage-md` - ドキュメント取得
- `mcp__xbrl-financial__extract-financial-metrics` - 財務指標抽出
- `mcp__xbrl-financial__get-company-overview` - 企業概要取得

## 🔧 システムアーキテクチャ

```
Claude Desktop
    ↓ (APIキー)
MCP Server (NPX)
    ↓ (APIキー認証)
/api/v1/config エンドポイント
    ↓ (Supabase設定返却)
MCP Server がSupabaseに接続
    ↓
XBRLデータアクセス可能
```

## 📊 APIキー方式のメリット

1. **個別管理** - ユーザーごとに異なるキー
2. **使用追跡** - APIコール数の記録
3. **Rate Limiting** - 100リクエスト/分
4. **セキュリティ** - いつでも無効化可能
5. **課金対応** - 将来の有料プラン対応

## ⚠️ 重要な注意事項

### やってはいけないこと
- ❌ Supabase URLとAnon Keyの直接設定
- ❌ APIキーをGitHubにコミット
- ❌ 他人のAPIキーを使用

### やるべきこと
- ✅ 自分専用のAPIキーを発行
- ✅ 定期的にキーをローテーション（90日推奨）
- ✅ 使用状況をダッシュボードで確認

## 🆘 トラブルシューティング

### "Storage error" エラー
- **原因**: 環境変数が設定されていない
- **解決**: `env`セクションにAPIキーを追加

### "Invalid API key" エラー
- **原因**: APIキーが無効または期限切れ
- **解決**: ダッシュボードで新しいキーを発行

### "Rate limit exceeded" エラー
- **原因**: 100リクエスト/分を超過
- **解決**: 少し待ってから再試行

## 📞 サポート

- **ダッシュボード**: https://xbrl-api-minimal.vercel.app/dashboard
- **GitHub Issues**: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- **NPMパッケージ**: https://www.npmjs.com/package/shared-supabase-mcp-minimal

---
**Version**: 2.1.0
**Last Updated**: 2025-01-14
**統一方式**: APIキー認証のみ