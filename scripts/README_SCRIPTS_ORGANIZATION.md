# Scripts Directory Organization Plan

## Current Script Categories

### Import/Upload Scripts (Need Consolidation)
- **import-all-years.js** - Import all fiscal years
- **import-all-deep-scan.js** - Deep scan import
- **import-parallel.js** - Parallel import
- **import-remaining-files.js** - Import remaining files
- **upload-all-files.js** - Upload all files
- **upload-to-supabase.js** - Upload to Supabase
- **upload-markdown-files.js** - Upload markdown files

### API Key Management
- **check-api-keys.js** - Check API keys
- **check-new-apikey.js** - Check new API key
- **generate-test-apikey.js** - Generate test API key
- **save-new-apikey.js** - Save new API key

### Testing Scripts
- **test-api.js** - Test API endpoints
- **test-login.js** - Test login flow
- **test-registration-flow.js** - Test registration
- **final-test-api.js** - Final API tests

### Data Management
- **check-companies.js** - Check companies data
- **check-metadata.js** - Check metadata
- **clean-orphaned-metadata.js** - Clean orphaned data
- **verify-upload.js** - Verify uploads

### Utilities
- **analyze-structure.js** - Analyze data structure
- **create-indexes.js** - Create DB indexes
- **setup-edge-function.js** - Setup edge functions

## Proposed New Structure

```
scripts/
├── README.md                      # Documentation
├── import/                        # Data import scripts
│   ├── import-all.js             # Main import script
│   ├── import-config.json        # Configuration
│   └── README.md                 # Import documentation
├── auth/                         # Authentication & API keys
│   ├── manage-api-keys.js       # Consolidated API key management
│   ├── test-auth.js             # Auth testing
│   └── README.md
├── testing/                     # Test scripts
│   ├── test-suite.js           # Main test suite
│   ├── test-api.js
│   └── test-auth.js
├── maintenance/                 # Maintenance & utilities
│   ├── clean-data.js
│   ├── verify-data.js
│   ├── create-indexes.js
│   └── README.md
└── archive/                    # Old scripts (before deletion)
    └── [timestamp]/
```

## Consolidation Plan

### Phase 1: Create Directory Structure
```bash
mkdir scripts/import scripts/auth scripts/testing scripts/maintenance scripts/archive
```

### Phase 2: Consolidate Similar Scripts
1. **Import scripts** → Single configurable `import-all.js`
2. **API key scripts** → Single `manage-api-keys.js` with commands
3. **Test scripts** → Test suite with modular tests

### Phase 3: Archive Old Scripts
- Move original scripts to `archive/` with timestamp
- Keep for 30 days before deletion

### Phase 4: Update Documentation
- Create README in each subdirectory
- Update main documentation

## Benefits
- **Reduced redundancy**: 7 import scripts → 1 configurable script
- **Better organization**: Clear categories and purpose
- **Easier maintenance**: Single point of update
- **Improved discoverability**: Clear structure and documentation