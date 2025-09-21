# 開発環境状態チェックスクリプト

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   XBRL API 開発環境チェック" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Node.jsバージョン確認
Write-Host "📦 Node.js バージョン:" -ForegroundColor Yellow
node --version

# npmバージョン確認
Write-Host "`n📦 npm バージョン:" -ForegroundColor Yellow
npm --version

# 現在のディレクトリ
Write-Host "`n📁 現在のディレクトリ:" -ForegroundColor Yellow
Get-Location

# package.jsonの存在確認
Write-Host "`n📄 package.json:" -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✅ 存在" -ForegroundColor Green
    $package = Get-Content package.json | ConvertFrom-Json
    Write-Host "   プロジェクト: $($package.name)" -ForegroundColor Gray
    Write-Host "   バージョン: $($package.version)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ 見つかりません" -ForegroundColor Red
}

# 重要な依存関係の確認
Write-Host "`n📚 重要な依存関係:" -ForegroundColor Yellow
$deps = @("next", "react", "tailwindcss", "autoprefixer", "postcss")
foreach ($dep in $deps) {
    $installed = npm ls $dep --depth=0 2>$null | Select-String $dep
    if ($installed) {
        Write-Host "   ✅ $dep" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $dep (インストールされていません)" -ForegroundColor Red
    }
}

# 環境変数ファイルの確認
Write-Host "`n🔐 環境変数ファイル:" -ForegroundColor Yellow
$envFiles = @(".env.local", ".env.production", ".env")
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   - $file (なし)" -ForegroundColor Gray
    }
}

# ポート使用状況
Write-Host "`n🌐 ポート使用状況:" -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003)
foreach ($port in $ports) {
    $inUse = netstat -ano | findstr ":$port"
    if ($inUse) {
        Write-Host "   ⚠️ ポート $port : 使用中" -ForegroundColor Red
    } else {
        Write-Host "   ✅ ポート $port : 利用可能" -ForegroundColor Green
    }
}

# Node.jsプロセス確認
Write-Host "`n⚙️ 実行中のNode.jsプロセス:" -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ⚠️ $($nodeProcesses.Count) 個のNode.jsプロセスが実行中" -ForegroundColor Red
    foreach ($process in $nodeProcesses) {
        Write-Host "      - PID: $($process.Id)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ Node.jsプロセスなし" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   チェック完了" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan