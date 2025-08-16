@echo off
echo =====================================
echo Claude Desktop MCP Setup Script
echo =====================================
echo.

:: Get user profile path
set CONFIG_PATH=%APPDATA%\Claude\claude_desktop_config.json

:: Check if Claude config directory exists
if not exist "%APPDATA%\Claude" (
    echo Creating Claude configuration directory...
    mkdir "%APPDATA%\Claude"
)

:: Create backup if config exists
if exist "%CONFIG_PATH%" (
    echo Backing up existing configuration...
    copy "%CONFIG_PATH%" "%CONFIG_PATH%.backup" > nul
    echo Backup saved to: %CONFIG_PATH%.backup
    echo.
)

:: Create the configuration file
echo Creating MCP configuration...
(
echo {
echo   "mcpServers": {
echo     "xbrl-financial-data": {
echo       "command": "node",
echo       "args": ["%CD%\\mcp-server.js"],
echo       "env": {
echo         "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
echo         "XBRL_API_KEY": "xbrl_live_test_admin_key_2025"
echo       }
echo     }
echo   }
echo }
) > "%CONFIG_PATH%"

echo.
echo =====================================
echo Configuration completed successfully!
echo =====================================
echo.
echo Configuration file created at:
echo %CONFIG_PATH%
echo.
echo Next steps:
echo 1. Restart Claude Desktop
echo 2. The XBRL MCP server should be available
echo.
echo To verify, ask Claude:
echo "Can you access the XBRL financial data?"
echo.
pause