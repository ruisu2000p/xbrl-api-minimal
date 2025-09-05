# XBRL Financial Data MCP サーバー設定ガイド

## 📋 セットアップフロー

### 1. APIキーの取得

1. **Webサイトにアクセス**
   ```
   https://xbrl-api-minimal.vercel.app/
   ```

2. **アカウント登録またはログイン**
   - 新規登録: `/register`
   - ログイン: `/login`

3. **APIキー発行**
   - ダッシュボードでAPIキーを生成
   - キーをコピー（例: `xbrl_live_xxxxxxxxxxxxx`）

### 2. MCPサーバーのインストール

#### 方法1: NPXを使用（推奨）
```bash
# インストール不要、直接実行可能
npx xbrl-mcp-server
```

#### 方法2: グローバルインストール
```bash
# グローバルにインストール
npm install -g xbrl-mcp-server

# 実行
xbrl-mcp-server
```

#### 方法3: ローカルパスを使用（開発環境）
```bash
# リポジトリをクローン
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal/mcp-server
npm install
```

### 3. Claude Desktop設定

1. **設定ファイルを開く**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **以下の設定を追加**

#### NPX使用（推奨）
```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "npx",
      "args": ["xbrl-mcp-server"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### ローカル開発環境
```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["C:\\Users\\[YourUsername]\\xbrl-api-minimal\\mcp-server\\bin\\mcp-server.mjs"],
      "env": {
        "XBRL_API_URL": "http://localhost:3005/api/v1",
        "XBRL_API_KEY": "xbrl_test_key_123"
      }
    }
  }
}
```

3. **APIキーを設定**
   - `"your-api-key-here"` を実際のAPIキーに置き換え

4. **Claude Desktopを再起動**
   - 設定を反映させるため完全に終了して再起動

### 4. 動作確認

Claude Desktopで以下のような質問をしてテスト:

```
「XBRL財務データベースの統計情報を表示してください」
```

```
「FY2024の財務文書を10件検索してください」
```

```
「S100L3K4（タカショー）の企業概要を表示してください」
```

## 🔧 利用可能なツール

### 1. search_financial_documents
- 財務文書を検索（企業ID、年度、文書タイプで絞り込み）

### 2. get_document_content  
- 特定の財務文書の内容を取得

### 3. get_company_overview
- 企業の全年度の文書概要を取得

### 4. get_year_summary
- 特定年度の全企業サマリーを取得

### 5. get_database_stats
- データベース全体の統計情報を取得

## 📊 データ仕様

- **総文書数**: 101,983ファイル
- **対象期間**: FY2015 - FY2025
- **企業数**: 約5,000社
- **文書タイプ**: 
  - PublicDoc（有価証券報告書）
  - AuditDoc（監査報告書）

## ⚠️ トラブルシューティング

### MCPサーバーが認識されない
1. Claude Desktopを完全に終了（タスクトレイからも）
2. 設定ファイルのJSON構文を確認
3. Node.jsがインストールされているか確認: `node --version`
4. Claude Desktopを再起動

### APIエラーが発生する
1. APIキーが正しく設定されているか確認
2. インターネット接続を確認
3. APIキーの有効期限を確認（ダッシュボードで確認）

### ローカル開発時のエラー
1. ローカルAPIサーバーが起動しているか確認
   ```bash
   cd xbrl-api-minimal
   npm run dev
   ```
2. ポート3005が使用可能か確認

## 📝 料金プラン

- **Free**: ¥0/月 - 100回/月のAPI呼び出し
- **Basic**: ¥1,080/月 - 500回/月のAPI呼び出し  
- **Pro**: ¥2,980/月 - 無制限のAPI呼び出し

## 🔗 関連リンク

- [Webアプリ](https://xbrl-api-minimal.vercel.app/)
- [GitHub](https://github.com/ruisu2000p/xbrl-api-minimal)
- [API Documentation](https://xbrl-api-minimal.vercel.app/docs)