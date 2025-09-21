# Vercel MCP Setup Guide

## 概要

Vercel MCP (Model Context Protocol) を使用すると、Claude DesktopからVercelプロジェクトを直接管理できます。

## セットアップ手順

### 1. Vercelアクセストークンの取得

1. [Vercel Dashboard](https://vercel.com/account/tokens) にアクセス
2. "Create Token" をクリック
3. トークン名を入力（例: "xbrl-mcp"）
4. スコープを選択（推奨: フルアクセス）
5. トークンをコピー

### 2. Claude Desktop設定

`%APPDATA%\Claude\claude_desktop_config.json` を編集:

```json
{
  "mcpServers": {
    "vercel-mcp": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp"],
      "env": {
        "VERCEL_ACCESS_TOKEN": "YOUR_VERCEL_ACCESS_TOKEN"
      }
    }
  }
}
```

### 3. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを完全に終了して再起動します。

## 利用可能な機能

### ドキュメント検索
```
「Vercelのdeployment設定について教えて」
「Edge Functionsの使い方を検索」
```

### プロジェクト管理
```
「xbrl-api-minimalプロジェクトの状態を確認」
「最新のデプロイメントを表示」
```

### デプロイメントログ分析
```
「最後のビルドエラーを分析」
「デプロイメントログを確認」
```

## プロジェクト専用URL

このプロジェクト専用のMCP URLを使用すると、自動的にコンテキストが設定されます:

```
https://mcp.vercel.com/ruisu2000p/xbrl-api-minimal
```

## セキュリティ注意事項

1. **エンドポイントの確認**: 必ず公式エンドポイント `https://mcp.vercel.com` を使用
2. **信頼できるクライアントのみ使用**: Claude Desktop、VS Codeなど
3. **ヒューマン確認を有効化**: 重要な操作には確認を要求
4. **トークンの保護**: アクセストークンを安全に管理

## トラブルシューティング

### MCPが認識されない場合
```bash
# キャッシュクリア
npm cache clean --force

# 再インストール
npx -y @vercel/mcp
```

### 接続エラーの場合
1. トークンの有効性を確認
2. ネットワーク接続を確認
3. Claude Desktopのログを確認

## サポートされているクライアント

- Claude Code
- Claude Desktop
- ChatGPT
- Cursor
- VS Code with Copilot
- Devin
- Raycast
- Gemini Code Assist

## 注意事項

- 現在Beta版のため、仕様が変更される可能性があります
- Vercelの[Public Beta Agreement](https://vercel.com/legal/public-beta-agreement)が適用されます

## 関連リンク

- [Vercel MCP Documentation](https://vercel.com/docs/mcp/vercel-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)