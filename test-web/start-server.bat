@echo off
echo ========================================
echo   XBRL API テストサーバー起動
echo ========================================
echo.
echo 📌 アクセス方法:
echo   Web UI: http://localhost:3001
echo   API: http://localhost:3001/api
echo.
echo 🔑 テスト用APIキー:
echo   "demo-key" または "test-key"
echo.
echo 🚀 起動中...
echo.

set NODE_ENV=development
set PORT=3001
set SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs

npm start