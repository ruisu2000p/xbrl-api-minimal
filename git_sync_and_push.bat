@echo off
echo ========================================
echo Git Sync and Push
echo ========================================

cd /d C:\Users\pumpk\Downloads\xbrl-api-minimal

echo.
echo Fetching latest changes from GitHub...
git fetch origin

echo.
echo Current status:
git status

echo.
echo ========================================
echo Pulling latest changes...
echo ========================================
git pull origin main --rebase

echo.
echo ========================================
echo Pushing to GitHub...
echo ========================================
git push origin main

echo.
echo ========================================
echo Complete!
echo ========================================
echo.
echo Check deployment status at:
echo https://vercel.com/aas-projects-49d0d7ef/xbrl-api-minimal
echo.
pause