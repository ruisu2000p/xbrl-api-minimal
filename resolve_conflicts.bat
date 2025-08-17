@echo off
echo ========================================
echo Resolving Git Conflicts
echo ========================================

cd /d C:\Users\pumpk\Downloads\xbrl-api-minimal

echo.
echo Current status:
git status

echo.
echo ========================================
echo Resolving conflicts...
echo ========================================

echo.
echo Keeping remote versions of deleted files:
git add app/docs/page.tsx
git add app/forgot-password/page.tsx
git add app/register/page.tsx

echo.
echo Resolving admin pages conflicts (keeping remote version):
git checkout --theirs app/admin-reset/page.tsx
git add app/admin-reset/page.tsx

git checkout --theirs app/admin/login/page.tsx
git add app/admin/login/page.tsx

echo.
echo ========================================
echo Continuing rebase...
echo ========================================
git rebase --continue

echo.
echo ========================================
echo Final push to GitHub...
echo ========================================
git push origin main

echo.
echo ========================================
echo Complete!
echo ========================================
pause