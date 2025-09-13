# 🔒 重要なセキュリティアップデート: v2.0.0

## 📢 全ユーザー様へ

**shared-supabase-mcp-minimal** のバージョン2.0.0をリリースしました。
このバージョンには**重要なセキュリティ修正**が含まれています。

## ⚠️ セキュリティ脆弱性の修正

### 問題点（v1.9.1以前）
- 認証情報（APIキー）がソースコードにハードコードされていました
- NPMパッケージから誰でもキーを取得可能な状態でした

### 解決策（v2.0.0）
- ✅ 環境変数による安全な認証情報管理
- ✅ セキュリティ監視機能の追加
- ✅ レート制限の実装
- ✅ 不正アクセス検出

## 🚀 移行方法

### 1. 最新版のインストール

```bash
# NPX経由（推奨）
npx shared-supabase-mcp-minimal@latest

# またはグローバルインストール
npm install -g shared-supabase-mcp-minimal@latest
```

### 2. Claude Desktop設定の更新

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_ANON_KEY": "your-new-anon-key-here"
      }
    }
  }
}
```

### 3. 環境変数の設定

新しいAPIキーをSupabaseダッシュボードで生成し、環境変数として設定してください。

## 📊 バージョン比較

| 機能 | v1.9.1 | v2.0.0 |
|-----|--------|--------|
| 認証方法 | ❌ ハードコード | ✅ 環境変数 |
| セキュリティ監視 | ❌ なし | ✅ あり |
| レート制限 | ❌ なし | ✅ 100req/分 |
| SQLインジェクション防止 | ❌ なし | ✅ あり |
| キーローテーション | ❌ 不可能 | ✅ 可能 |

## 🔐 新機能

### セキュリティステータス確認
```
Tool: get-security-status
```

このツールで以下を確認できます：
- 総リクエスト数
- 疑わしいアクティビティの検出
- レート制限の状態

## ⏰ 移行スケジュール

- **即座**: v2.0.0へのアップグレードを強く推奨
- **2024年2月末**: v1.x系のサポート終了予定
- **2024年3月**: v1.x系の完全非推奨化

## 📞 サポート

問題が発生した場合：
1. [SECURITY_MIGRATION_GUIDE.md](https://github.com/ruisu2000p/shared-supabase-mcp-minimal/blob/main/SECURITY_MIGRATION_GUIDE.md)を参照
2. [GitHub Issues](https://github.com/ruisu2000p/shared-supabase-mcp-minimal/issues)で報告
3. NPMパッケージページ: https://www.npmjs.com/package/shared-supabase-mcp-minimal

## 🙏 お願い

セキュリティは全ユーザーの協力が必要です。
早急なアップグレードをお願いいたします。

---

**開発チーム一同**
2024年1月