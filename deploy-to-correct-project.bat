@echo off
echo Deploying to the correct Supabase project...
echo.

REM Correct project ID
set PROJECT_ID=zxzyidqrvzfzhicfuhlo

echo Deploying keys_issue function to project %PROJECT_ID%...
call npx supabase functions deploy keys_issue --project-ref %PROJECT_ID%

echo.
echo Deploying v1_filings function to project %PROJECT_ID%...  
call npx supabase functions deploy v1_filings --project-ref %PROJECT_ID%

echo.
echo Setting environment secrets...
call npx supabase secrets set KEY_PEPPER=xbrl_pepper_2025_secure_key --project-ref %PROJECT_ID%

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo Function URLs:
echo - keys_issue: https://%PROJECT_ID%.supabase.co/functions/v1/keys_issue
echo - v1_filings: https://%PROJECT_ID%.supabase.co/functions/v1/v1_filings
echo.
echo Test page: Open test-api-frontend.html in your browser
echo.
pause