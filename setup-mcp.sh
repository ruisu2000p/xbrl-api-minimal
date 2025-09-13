#!/bin/bash

echo "XBRL MCP Server セットアップ"

# MCPパッケージをグローバルインストール
echo "MCPサーバーをインストール中..."
npm install -g xbrl-mcp-server

# Claude Desktop設定ファイルのパス（OS判定）
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
else
    CONFIG_PATH="$HOME/.config/claude/claude_desktop_config.json"
fi

echo "Claude Desktop設定ファイルの場所: $CONFIG_PATH"

# ディレクトリが存在しない場合は作成
CONFIG_DIR=$(dirname "$CONFIG_PATH")
if [ ! -d "$CONFIG_DIR" ]; then
    mkdir -p "$CONFIG_DIR"
fi

# テンプレート設定ファイルをコピー
if [ ! -f "$CONFIG_PATH" ]; then
    echo "新しい設定ファイルを作成中..."
    cp claude_desktop_config.template.json "$CONFIG_PATH"
else
    echo "既存の設定ファイルが見つかりました"
    echo "手動でMCP設定を追加してください: claude_desktop_config.template.json を参照"
fi

echo ""
echo "セットアップ完了！"
echo "次の手順:"
echo "1. https://xbrl-api-minimal.vercel.app でAPIキーを取得"
echo "2. $CONFIG_PATH でAPIキーを設定"
echo "3. Claude Desktopを再起動"
echo ""