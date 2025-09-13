@echo off
echo ========================================
echo Git Push to GitHub
echo ========================================

cd /d C:\Users\pumpk\Downloads\xbrl-api-minimal

echo.
echo Current status:
git status

echo.
echo ========================================
echo Adding all changes...
echo ========================================
git add .

echo.
echo ========================================
echo Creating commit...
echo ========================================
git commit -m "Update MCP configuration and add FY2016 data support

- Updated Claude Desktop MCP API key configuration
- Added FY2016 financial data (996 companies)
- Created SQL scripts for company_latest_reports table
- Fixed security issues (RLS, search_path, SECURITY DEFINER)
- Added test scripts for FY2016 data verification"

echo.
echo ========================================
echo Pushing to GitHub...
echo ========================================
git push origin main

echo.
echo ========================================
echo Push complete!
echo ========================================
echo.
echo Check deployment status at:
echo https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal
echo.
pause