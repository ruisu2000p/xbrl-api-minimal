# Supabase Edge Functions デプロイスクリプト (PowerShell)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Supabase Edge Functions Deployment" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# プロジェクトIDの設定
$PROJECT_ID = "wpwqxhyiglbtlaimrjrx"
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Yellow

# Edge Functionsのリスト
$functions = @(
    "search-companies",
    "query-my-data",
    "get-storage-md",
    "keys_issue",
    "keys_issue_standalone"
)

# 各関数をデプロイ
foreach ($func in $functions) {
    Write-Host ""
    Write-Host "Deploying function: $func" -ForegroundColor Green
    Write-Host "------------------------"

    # Supabase CLIでデプロイ
    supabase functions deploy $func --project-ref $PROJECT_ID

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "All functions deployed successfully!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan

# Edge Functions URLの表示
Write-Host ""
Write-Host "Edge Functions URLs:" -ForegroundColor Yellow
Write-Host "-------------------"
foreach ($func in $functions) {
    Write-Host "https://$PROJECT_ID.supabase.co/functions/v1/$func"
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green