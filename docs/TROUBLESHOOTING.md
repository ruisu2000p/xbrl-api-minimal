# Troubleshooting Guide

## Vercel Deployment Issues

### Environment Variables
- Ensure all required environment variables are set in Vercel Dashboard
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

### Build Errors
1. Check Node.js version compatibility (requires 18+)
2. Clear Vercel cache: Settings → Functions → Clear Cache
3. Verify all dependencies are in package.json

### Common Fixes
- Module not found: Run `npm install` locally and commit package-lock.json
- Type errors: Ensure TypeScript version matches locally and on Vercel
- API route errors: Check that all environment variables are properly loaded

## Supabase Connection Issues

### Authentication Errors
- Verify API keys are correct and not expired
- Check Row Level Security (RLS) policies
- Ensure tables have proper permissions

### Database Errors
- Check if tables exist: Run migration scripts
- Verify column names match your queries
- Check data types compatibility

## API Issues

### 401 Unauthorized
- API key is missing or invalid
- Check X-API-Key header is being sent
- Verify API key starts with correct prefix

### 500 Internal Server Error
- Check server logs in Vercel Functions tab
- Verify Supabase connection
- Check for missing environment variables

## Quick Fixes

### Reset Everything
```bash
# Clear all caches
npm run clean
rm -rf .next node_modules
npm install
npm run build
```

### Verify Setup
```bash
# Check environment
node scripts/verify-env.js

# Test Supabase connection
node scripts/test-connection.js
```

## Emergency Contacts
- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support