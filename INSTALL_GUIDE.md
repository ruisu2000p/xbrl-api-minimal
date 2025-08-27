# 📦 XBRL MCP Server インストールガイド

どなたでも使えるように、複数のインストール方法を用意しました。

## 🚀 インストール方法

### 方法1: npxで直接実行（最も簡単）

```bash
# インストール不要で実行
npx @xbrl-jp/mcp-server
```

### 方法2: グローバルインストール

```bash
# npmでインストール
npm install -g @xbrl-jp/mcp-server

# または yarn
yarn global add @xbrl-jp/mcp-server

# 実行
xbrl-mcp
```

### 方法3: GitHubから直接インストール

```bash
# GitHubから最新版をインストール
npm install -g github:xbrl-jp/mcp-server

# または特定のバージョン
npm install -g github:xbrl-jp/mcp-server#v1.0.0
```

### 方法4: ローカルインストール

```bash
# プロジェクトフォルダを作成
mkdir my-xbrl-mcp
cd my-xbrl-mcp

# パッケージをインストール
npm install @xbrl-jp/mcp-server

# 実行
npx xbrl-mcp
```

## ⚙️ Claude Desktop設定

### Windows
`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key-here"
      }
    }
  }
}
```

### Mac/Linux
`~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key-here"
      }
    }
  }
}
```

## 🔑 認証情報の取得

### オプション1: 公開データベース使用（デモ用）
```json
{
  "env": {
    "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
    "SUPABASE_ANON_KEY": "public-anon-key-here"
  }
}
```

### オプション2: 自分のSupabaseプロジェクト
1. [Supabase](https://supabase.com)でプロジェクト作成
2. Settings → API からキーを取得
3. 環境変数に設定

## 📝 環境変数設定

### グローバル設定（推奨）

#### Windows
```powershell
# システム環境変数に設定
[System.Environment]::SetEnvironmentVariable("SUPABASE_URL", "your-url", "User")
[System.Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_KEY", "your-key", "User")
```

#### Mac/Linux
```bash
# ~/.bashrc または ~/.zshrc に追加
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_KEY="your-key"
```

### ローカル設定（.envファイル）

プロジェクトフォルダに`.env`ファイルを作成：

```env
SUPABASE_URL=https://zxzyidqrvzfzhicfuhlo.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

## 🌍 複数ユーザー対応設定例

### 組織内配布用
```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "SUPABASE_URL": "${COMPANY_SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${COMPANY_SUPABASE_KEY}"
      }
    }
  }
}
```

### Docker版（上級者向け）
```dockerfile
FROM node:18-alpine
RUN npm install -g @xbrl-jp/mcp-server
CMD ["xbrl-mcp"]
```

```bash
# Docker実行
docker run -e SUPABASE_URL=xxx -e SUPABASE_SERVICE_KEY=yyy xbrl-mcp
```

## ✅ 動作確認

Claude Desktopで以下を実行：

```
「インストールされているMCPサーバーを確認して」
「XBRLツールの一覧を表示して」
「亀田製菓の情報を検索して」
```

## 🆘 トラブルシューティング

### 「command not found」エラー
```bash
# npmのグローバルパスを確認
npm config get prefix

# PATHに追加（Windows）
set PATH=%PATH%;C:\Users\%USERNAME%\AppData\Roaming\npm

# PATHに追加（Mac/Linux）
export PATH=$PATH:$(npm config get prefix)/bin
```

### 権限エラー
```bash
# Mac/Linux
sudo npm install -g @xbrl-jp/mcp-server

# Windows（管理者権限のコマンドプロンプト）
npm install -g @xbrl-jp/mcp-server
```

### プロキシ環境
```bash
# プロキシ設定
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

## 📊 利用統計

このMCPサーバーを利用すると、以下のデータにアクセスできます：

- 企業数: 5,000社以上
- 財務データ: 2016年〜2025年
- ドキュメント: 各社10-20種類
- 更新頻度: 四半期ごと

## 🤝 コントリビューション

改善案やバグ報告は以下へ：
- GitHub Issues: https://github.com/xbrl-jp/mcp-server/issues
- Pull Requests歓迎

## 📜 ライセンス

MIT License - 自由に利用・改変可能

---

セットアップに関する質問は、GitHubのIssuesまでお願いします。