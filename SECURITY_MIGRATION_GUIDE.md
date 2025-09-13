# 🔒 セキュリティ移行ガイド v2.0.0

## ⚠️ 重要: セキュリティアップデート

バージョン1.x系では認証情報がハードコードされていましたが、v2.0.0より環境変数による安全な管理に移行しました。

## 📋 移行手順

### Step 1: Supabaseで新しいAPIキーを生成

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. Settings → API に移動
4. 「Generate new anon key」をクリック
5. 新しいキーをコピー

⚠️ **重要**: 古いキーは移行完了後に必ず無効化してください

### Step 2: 環境変数の設定

#### Windows (コマンドプロンプト)
```cmd
set SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
set SUPABASE_ANON_KEY=your-new-anon-key-here
```

#### Windows (PowerShell)
```powershell
$env:SUPABASE_URL = "https://wpwqxhyiglbtlaimrjrx.supabase.co"
$env:SUPABASE_ANON_KEY = "your-new-anon-key-here"
```

#### macOS/Linux
```bash
export SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
export SUPABASE_ANON_KEY=your-new-anon-key-here
```

### Step 3: Claude Desktop設定の更新

`%APPDATA%\Claude\claude_desktop_config.json` を開いて以下のように更新:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:\\Users\\YOUR_USERNAME\\shared-supabase-mcp-minimal\\package\\index-secure.js"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_ANON_KEY": "your-new-anon-key-here"
      }
    }
  }
}
```

### Step 4: 動作確認

```bash
# テスト実行
node index-secure.js --healthcheck

# 期待される出力:
# {"ok":true,"secure":true}
```

## 🔐 セキュリティ機能

### 1. レート制限
- デフォルト: 100リクエスト/分
- 超過時は自動的にブロック

### 2. 不正パターン検出
- SQLインジェクション防止
- パストラバーサル攻撃防止
- 大量データ取得の制限

### 3. 監視とログ
- すべての疑わしいアクティビティをログ記録
- `get-security-status`ツールでステータス確認可能

## 📊 新機能: セキュリティステータス確認

MCPツールから以下のコマンドで確認可能:

```
Tool: get-security-status
```

返却される情報:
- 総リクエスト数
- 疑わしいアクティビティ数
- レート制限設定
- 最後の疑わしいアクティビティ

## ⚡ トラブルシューティング

### エラー: "Missing SUPABASE_URL environment variable"

**原因**: 環境変数が設定されていない

**解決方法**:
1. 環境変数を設定（上記Step 2参照）
2. Claude Desktopを再起動

### エラー: "Request blocked by security monitor"

**原因**: レート制限に到達

**解決方法**:
1. 1分待って再試行
2. 必要に応じてレート制限を調整

### エラー: "Invalid path detected"

**原因**: セキュリティ違反（パストラバーサル攻撃の可能性）

**解決方法**:
1. パスに`../`が含まれていないか確認
2. 正しいパス形式を使用

## 🚀 旧バージョンからの移行

### v1.xユーザー向け

1. **即座に実行**: 新しいAPIキーを生成
2. **24時間以内**: 環境変数版に移行
3. **1週間以内**: 古いキーを無効化

### 互換性

- v2.0.0は環境変数が必須
- v1.xのハードコード版は非推奨
- 段階的移行のため、両バージョン並行運用可能

## 📝 変更履歴

### v2.0.0 (2024-01-XX)
- 🔒 環境変数による認証情報管理
- 🛡️ セキュリティ監視機能追加
- ⚡ レート制限実装
- 🚫 不正パターン検出
- 📊 セキュリティステータス確認ツール

### v1.9.1 (旧版)
- ⚠️ ハードコードされた認証情報（非推奨）

## 🆘 サポート

問題が発生した場合:

1. このガイドのトラブルシューティングを確認
2. [GitHub Issues](https://github.com/your-repo/issues)で報告
3. セキュリティ関連の問題は非公開で連絡

---

**重要**: セキュリティは継続的なプロセスです。定期的にキーをローテーションし、最新バージョンを使用してください。