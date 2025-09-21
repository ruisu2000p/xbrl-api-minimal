# 開発サーバー再起動スクリプト

Write-Host "🔄 開発サーバーを再起動します..." -ForegroundColor Cyan

# 既存のNode.jsプロセスを停止
Write-Host "1. 既存のNode.jsプロセスを停止中..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "   ✅ プロセス停止完了" -ForegroundColor Green

# ポートの使用状況確認
Write-Host "`n2. ポート3000の使用状況確認..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   ⚠️ ポート3000が使用中" -ForegroundColor Red
} else {
    Write-Host "   ✅ ポート3000は利用可能" -ForegroundColor Green
}

# .nextキャッシュをクリア
Write-Host "`n3. キャッシュをクリア中..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ .nextキャッシュをクリア" -ForegroundColor Green
}

# 環境変数の確認
Write-Host "`n4. 環境変数の確認..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ .env.localが存在" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ .env.localが見つかりません" -ForegroundColor Red
}

# 開発サーバー起動
Write-Host "`n5. 開発サーバーを起動中..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000" -ForegroundColor White
Write-Host "   Ctrl+Cで停止できます" -ForegroundColor Gray

# NODE_ENVをクリア
$env:NODE_ENV = $null

# 開発サーバー起動
npm run dev