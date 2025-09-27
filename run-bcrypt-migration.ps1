# PowerShell script to run bcrypt migration

# Set environment variables if needed
$env:SUPABASE_PROJECT_REF = "wpwqxhyiglbtlaimrjrx"

Write-Host "🚀 Applying bcrypt migration to Supabase..." -ForegroundColor Green

# Run the migration using supabase CLI
& "C:\Users\pumpk\supabase.exe" db push --db-url "postgresql://postgres.wpwqxhyiglbtlaimrjrx:$env:SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please apply manually via Supabase Dashboard." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/sql/new" -ForegroundColor Cyan
    Write-Host "2. Copy the content from: supabase\migrations\20250128_update_api_key_to_bcrypt.sql" -ForegroundColor Cyan
    Write-Host "3. Run the SQL query" -ForegroundColor Cyan
}