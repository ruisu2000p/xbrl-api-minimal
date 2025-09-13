@echo off
echo XBRL MCP Server セットアップ

REM MCPパッケージをグローバルインストール
echo MCPサーバーをインストール中...
npm install -g xbrl-mcp-server

REM Claude Desktop設定ファイルのパス
set CONFIG_PATH=%APPDATA%\Claude\claude_desktop_config.json

echo Claude Desktop設定ファイルの場所: %CONFIG_PATH%

REM テンプレート設定ファイルをコピー
if not exist "%APPDATA%\Claude" (
    mkdir "%APPDATA%\Claude"
)

if not exist "%CONFIG_PATH%" (
    echo 新しい設定ファイルを作成中...
    copy claude_desktop_config.template.json "%CONFIG_PATH%"
) else (
    echo 既存の設定ファイルが見つかりました
    echo 手動でMCP設定を追加してください: claude_desktop_config.template.json を参照
)

echo.
echo セットアップ完了！
echo 次の手順:
echo 1. https://xbrl-api-minimal.vercel.app でAPIキーを取得
echo 2. %CONFIG_PATH% でAPIキーを設定
echo 3. Claude Desktopを再起動
echo.
pause