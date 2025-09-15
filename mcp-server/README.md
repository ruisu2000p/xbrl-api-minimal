<<<<<<< HEAD:package/README.md
# shared-supabase-mcp-minimal v3.0.0 🚀
=======
# shared-supabase-mcp-minimal v2.1.0 🔒
>>>>>>> 49f3b05583674b8c9528708df26b94b85170a873:mcp-server/README.md

**Commercial XBRL Financial Data MCP Server - 286,742 documents from 1,100+ Japanese companies**

[![npm version](https://badge.fury.io/js/shared-supabase-mcp-minimal.svg)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Security Status](https://img.shields.io/badge/Security-Enhanced-green)](https://github.com/ruisu2000p/shared-supabase-mcp-minimal)

## ⚠️ SECURITY UPDATE - v2.1.0

**IMPORTANT**: Version 2.1.0 includes critical security improvements and dependency optimizations. All versions prior to 2.0.0 have been deprecated due to hardcoded credentials vulnerability.

### 🔒 Security Features
- ✅ **Environment-based authentication** - No more hardcoded keys
- ✅ **SQL injection protection** - Input validation and sanitization
- ✅ **Path traversal prevention** - Secure file access

## 📋 Migration from v1.x to v2.1.0

### Step 1: Install the latest version
```bash
npm install -g shared-supabase-mcp-minimal@latest
# or use npx (recommended)
npx shared-supabase-mcp-minimal@latest
```

### Step 2: Set environment variables
```bash
# Windows (Command Prompt)
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_ANON_KEY=your-anon-key-here

# Windows (PowerShell)
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key-here"

# macOS/Linux
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Update Claude Desktop configuration

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

## 🚀 Features

- **4,231 Japanese companies** - Comprehensive financial data coverage
- **5 years of data (FY2021-FY2025)** - Latest financial reports
- **Markdown format** - Pre-converted from XBRL for easy reading
- **Secure authentication** - Environment variable based (v2.0.0+)
- **MCP protocol compliant** - Clean stdout, proper JSON-RPC communication

## 📊 Available Tools

### `query-my-data`
Query XBRL financial data from Supabase tables with security validation.

**Parameters:**
- `table` (required): Table name (companies, markdown_files_metadata)
- `filters` (optional): Filter conditions with SQL injection protection
- `select` (optional): Columns to select
- `limit` (optional): Number of results to return

### `get-storage-md`
Retrieve Markdown documents from Supabase Storage with path validation.

**Parameters:**
- `storage_path` (required): Secure path to the Markdown file
- `max_bytes` (optional): Maximum bytes to retrieve (max: 1MB)

### `search-companies`
Search companies by name or ticker code with input sanitization.

**Parameters:**
- `query` (required): Company name or ticker code
- `limit` (optional): Number of results (default: 10)


## 🔐 Security Best Practices

1. **Generate new API keys** in Supabase Dashboard
2. **Never commit `.env` files** to version control
3. **Rotate keys regularly** (recommended: every 90 days)
4. **Use environment variables** for all sensitive configuration

## 🛡️ Security Configuration

### Environment Variables (Required)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```


## 📈 Version Comparison

| Feature | v1.9.1 | v2.1.0 |
|---------|--------|--------|
| Authentication | ❌ Hardcoded | ✅ Environment Variables |
| SQL Injection Protection | ❌ None | ✅ Full validation |
| Path Traversal Prevention | ❌ None | ✅ Path validation |
| Key Rotation | ❌ Not possible | ✅ Anytime |
| Dependencies | ❌ Bloated | ✅ Optimized |

## 🆘 Troubleshooting

### Error: "Missing SUPABASE_URL environment variable"
**Solution**: Set the required environment variables (see Step 2 above)


### Error: "Invalid path detected"
**Solution**: Ensure your file paths don't contain `../` or other traversal patterns.

## 📝 Migration Checklist

- [ ] Install v2.1.0 or later
- [ ] Set environment variables
- [ ] Update Claude Desktop config
- [ ] Generate new API keys in Supabase
- [ ] Test connection with `--healthcheck`
- [ ] Invalidate old hardcoded keys

## 🔗 Resources

- [Security Migration Guide](https://github.com/ruisu2000p/shared-supabase-mcp-minimal/blob/main/SECURITY_MIGRATION_GUIDE.md)
- [NPM Package](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
- [GitHub Repository](https://github.com/ruisu2000p/shared-supabase-mcp-minimal)
- [Supabase Dashboard](https://app.supabase.com)

## 📜 License

MIT

## 🤝 Contributing

Security issues should be reported privately. For other issues and feature requests, please use GitHub Issues.

---

**⚠️ IMPORTANT**: If you're using version 1.9.1 or earlier, please upgrade immediately to address the security vulnerability.