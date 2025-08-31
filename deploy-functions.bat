@echo off
echo Deploying Supabase Functions...
echo.

REM Project configuration
set SUPABASE_PROJECT_ID=zxzyidqrvzfzhicfuhlo
set SUPABASE_ACCESS_TOKEN=sbp_bc96f90d3c659cf387e17863b5f59bb2f699e0f0

echo Linking to Supabase project...
call npx supabase link --project-ref %SUPABASE_PROJECT_ID%

echo.
echo Deploying keys_issue function...
call npx supabase functions deploy keys_issue --project-ref %SUPABASE_PROJECT_ID%

echo.
echo Deploying v1_filings function...
call npx supabase functions deploy v1_filings --project-ref %SUPABASE_PROJECT_ID%

echo.
echo Setting environment secrets...
call npx supabase secrets set KEY_PEPPER=xbrl_pepper_2025_secure_key --project-ref %SUPABASE_PROJECT_ID%

echo.
echo Deployment complete!
echo.
echo Function URLs:
echo - keys_issue: https://%SUPABASE_PROJECT_ID%.supabase.co/functions/v1/keys_issue
echo - v1_filings: https://%SUPABASE_PROJECT_ID%.supabase.co/functions/v1/v1_filings
echo.
pause