@echo off
echo ========================================
echo Git Repository Status Check
echo ========================================

cd /d C:\Users\pumpk\Downloads\xbrl-api-minimal

echo.
echo Current branch:
git branch --show-current

echo.
echo Remote repository:
git remote -v

echo.
echo Recent commits:
git log --oneline -5

echo.
echo Modified files:
git status --short

echo.
echo ========================================
echo Status check complete
echo ========================================
pause