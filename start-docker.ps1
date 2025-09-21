# Docker Desktop起動スクリプト

Write-Host "Docker Desktopを起動しています..." -ForegroundColor Cyan

# Docker Desktopのパスを確認
$dockerPaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
)

$dockerPath = $null
foreach ($path in $dockerPaths) {
    if (Test-Path $path) {
        $dockerPath = $path
        break
    }
}

if ($dockerPath) {
    Write-Host "Docker Desktopを起動中: $dockerPath" -ForegroundColor Green
    Start-Process -FilePath $dockerPath

    Write-Host "Docker Desktopの起動を待っています..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Docker起動確認
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            docker version | Out-Null
            Write-Host "✓ Docker Desktopが正常に起動しました！" -ForegroundColor Green
            break
        }
        catch {
            $attempt++
            Write-Host "待機中... ($attempt/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }

    if ($attempt -eq $maxAttempts) {
        Write-Host "⚠ Docker Desktopの起動がタイムアウトしました。手動で起動してください。" -ForegroundColor Red
    }
}
else {
    Write-Host "⚠ Docker Desktopが見つかりません。" -ForegroundColor Red
    Write-Host "以下からDocker Desktopをインストールしてください:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
}