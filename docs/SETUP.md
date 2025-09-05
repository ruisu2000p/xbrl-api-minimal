# Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/ruisu2000p/xbrl-api-minimal
cd xbrl-api-minimal
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup
```bash
# Run master setup SQL
psql -h your_supabase_host -U postgres -d postgres -f sql/master-setup.sql

# Run migrations
npm run migrate
```

## Development
```bash
npm run dev
# Open http://localhost:3000
```

## Production Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Supabase Setup
1. Create new project
2. Run SQL scripts in Query Editor
3. Configure Row Level Security
4. Set up Storage buckets

## API Usage
See [API Documentation](./FINANCIAL_DATA_API.md)

## Troubleshooting
See [Troubleshooting Guide](./TROUBLESHOOTING.md)