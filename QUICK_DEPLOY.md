# Quick Deploy Instructions

## Option A: Fix Current Project

1. Go to: https://vercel.com/ruisu2000p/xbrl-api-minimal/settings/git
2. Click "Disconnect from Git"
3. Reconnect and select the repository
4. Ensure main branch is selected
5. Redeploy

## Option B: Create New Vercel Project

1. Delete current project in Vercel
2. Import new project: https://vercel.com/new
3. Import Git Repository: ruisu2000p/xbrl-api-minimal
4. Configure:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: npm run build
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://zxzyidqrvzfzhicfuhlo.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns
   ```
6. Deploy

## Test Command
After deployment, test with:
```bash
curl -H "X-API-Key: xbrl_live_test_admin_key_2025" https://xbrl-api-minimal.vercel.app/api/v1/companies?per_page=1
```

Expected: Returns data from 4,225 companies, not 10 sample companies.