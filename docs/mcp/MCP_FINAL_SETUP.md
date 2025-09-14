# XBRL Financial MCP 最終設定ガイド

## ✅ 正式なMCP設定

### Claude Desktop / Claude Code用設定ファイル

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"],
      "env": {
        "XBRL_API_KEY": "xbrl_fre_mfj56b8h_e626614251b1348e8392bd0985856619f868d4bd19e4d470",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

## 🔑 APIキーの形式

発行されたAPIキーの構造：
- **プレフィックス**: `xbrl_fre_` - フリーミアムプラン
- **一意識別子**: `mfj56b8h`
- **ハッシュ**: `e626614251b1348e8392bd0985856619f868d4bd19e4d470`

## 📍 設定ファイルの場所

### Windows
- Claude Desktop: `C:\Users\[ユーザー名]\.claude.json`
- Claude Code: 同じファイルまたは独自の設定

### Mac/Linux
- `~/.claude.json`

## 🚀 設定手順

1. **既存の設定ファイルを開く**
   ```bash
   notepad %USERPROFILE%\.claude.json
   ```

2. **mcpServersセクションに追加**
   - 上記のJSON設定をコピー
   - 既存の設定にマージ

3. **Claude Desktop/Code を再起動**

## 🧪 動作確認

MCPツールが使用可能になります：
- `mcp__xbrl-financial__search-companies` - 企業検索
- `mcp__xbrl-financial__query-my-data` - データクエリ
- `mcp__xbrl-financial__get-storage-md` - ドキュメント取得

## ⚠️ セキュリティ注意事項

- このAPIキーは**あなた専用**です
- GitHubなどに公開しないでください
- 定期的にダッシュボードで使用状況を確認

## 📊 使用状況の確認

ダッシュボードで確認可能：
https://xbrl-api-minimal.vercel.app/dashboard

- APIキーの使用回数
- アクセスログ
- Rate limit状況

## 🆘 トラブルシューティング

### エラー: "Invalid API key"
- APIキーが正しくコピーされているか確認
- ダッシュボードでキーのステータスを確認

### エラー: "Rate limit exceeded"
- 使用制限に達した可能性
- プランのアップグレードを検討

## 📝 補足

このAPIキーシステムにより：
- ✅ 個別の使用追跡
- ✅ セキュアなアクセス管理
- ✅ Supabase anon keyと同等の権限
- ✅ いつでも無効化可能

設定完了後、XBRL財務データにMCP経由でアクセスできます！