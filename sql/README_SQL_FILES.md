# SQL Files Organization Guide

## Current Setup Files (Need Consolidation)

### Main Setup Files
1. **production-setup.sql** - Main production setup (KEEP - PRIMARY)
2. **complete-production-setup.sql** - Complete production setup
3. **complete-setup.sql** - General complete setup
4. **setup-complete-system.sql** - System-wide setup
5. **complete-supabase-setup.sql** - Supabase-specific complete setup
6. **step-by-step-setup.sql** - Step-by-step version
7. **fixed-supabase-setup.sql** - Fixed version of Supabase setup
8. **safe-supabase-setup.sql** - Safe version of Supabase setup
9. **minimal-setup.sql** - Minimal setup version

### Specific Component Setup
- **setup-api-keys-table.sql** - API keys table setup (KEEP - MODULAR)
- **setup-rls-policies.sql** - RLS policies setup (KEEP - MODULAR)
- **verify-production-setup.sql** - Verification script (KEEP - UTILITY)

## Recommended Consolidation

### Keep These Files:
```
sql/
├── production-setup.sql          # Main consolidated setup
├── modules/
│   ├── setup-api-keys-table.sql  # API keys module
│   ├── setup-rls-policies.sql    # RLS policies module
│   └── setup-auth-tables.sql     # Auth tables module
├── utils/
│   └── verify-production-setup.sql # Verification utilities
└── archive/
    └── [old setup files]         # Archive old versions
```

### Files to Archive/Remove:
- complete-production-setup.sql (merge into production-setup.sql)
- complete-setup.sql (redundant)
- setup-complete-system.sql (redundant)
- complete-supabase-setup.sql (redundant)
- step-by-step-setup.sql (convert to documentation)
- fixed-supabase-setup.sql (already fixed in main)
- safe-supabase-setup.sql (safety measures in main)
- minimal-setup.sql (keep as reference only)

## Migration Plan

1. **Phase 1**: Create backup of all SQL files
2. **Phase 2**: Merge all setup variations into single `production-setup.sql`
3. **Phase 3**: Extract modular components (API keys, RLS, Auth)
4. **Phase 4**: Archive old files with timestamps
5. **Phase 5**: Update documentation

## Notes
- All consolidated changes should be tested in development first
- Keep backups of all original files before deletion
- Document any specific features from removed files in comments