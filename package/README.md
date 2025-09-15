# shared-supabase-mcp-minimal v3.0.0 🚀

**Commercial XBRL Financial Data MCP Server - 286,742 documents from 1,100+ Japanese companies**

[![npm version](https://badge.fury.io/js/shared-supabase-mcp-minimal.svg)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Security Status](https://img.shields.io/badge/Security-Enhanced-green)](https://github.com/ruisu2000p/shared-supabase-mcp-minimal)

## ⚠️ SECURITY UPDATE - v2.0.0

**IMPORTANT**: Version 2.0.0 includes critical security improvements. All versions prior to 2.0.0 have been deprecated due to hardcoded credentials vulnerability.

### 🔒 Security Features (NEW)
- ✅ **Environment-based authentication** - No more hardcoded keys
- ✅ **Rate limiting** - 100 requests per minute
- ✅ **SQL injection protection** - Input validation and sanitization
- ✅ **Path traversal prevention** - Secure file access
- ✅ **Activity monitoring** - Real-time security logging
- ✅ **Suspicious pattern detection** - Automatic threat blocking

## 📋 Migration from v1.x to v2.0.0

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
- **Markdown format** - Pre-converted from XBRL for easy reading
- **Secure authentication** - Environment variable based (v2.0.0+)
- **Real-time monitoring** - Security status tracking
- **MCP protocol compliant** - Clean stdout, proper JSON-RPC communication

## 📊 Available Tools

### `query-my-data`
Query XBRL financial data from Supabase tables with security validation.

**Parameters:**
- `table` (required): Table name (companies, markdown_files_metadata)
- `filters` (optional): Filter conditions with SQL injection protection
- `select` (optional): Columns to select
- `limit` (optional): Max 100 results per query

### `get-storage-md`
Retrieve Markdown documents from Supabase Storage with path validation.

**Parameters:**
- `storage_path` (required): Secure path to the Markdown file
- `max_bytes` (optional): Maximum bytes to retrieve (max: 1MB)

### `search-companies`
Search companies by name or ticker code with input sanitization.

**Parameters:**
- `query` (required): Company name or ticker code (2-100 chars)
- `limit` (optional): Number of results (max: 50)

### `get-security-status` (NEW)
Monitor security status and suspicious activities.

**Returns:**
- Total request count
- Suspicious activity log
- Rate limit status
- Security configuration

## 🔐 Security Best Practices

1. **Generate new API keys** in Supabase Dashboard
2. **Never commit `.env` files** to version control
3. **Rotate keys regularly** (recommended: every 90 days)
4. **Monitor security status** using `get-security-status` tool
5. **Review activity logs** for suspicious patterns

## 🛡️ Security Configuration

### Environment Variables (Required)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional Security Settings
```bash
MAX_REQUESTS_PER_MINUTE=100  # Default: 100
ENABLE_SECURITY_MONITORING=true  # Default: true
LOG_SUSPICIOUS_ACTIVITY=true  # Default: true
```

## 📈 Version Comparison

| Feature | v1.9.1 | v2.0.0 |
|---------|--------|--------|
| Authentication | ❌ Hardcoded | ✅ Environment Variables |
| Rate Limiting | ❌ None | ✅ 100 req/min |
| SQL Injection Protection | ❌ None | ✅ Full validation |
| Path Traversal Prevention | ❌ None | ✅ Path validation |
| Security Monitoring | ❌ None | ✅ Real-time |
| Key Rotation | ❌ Not possible | ✅ Anytime |

## 🆘 Troubleshooting

### Error: "Missing SUPABASE_URL environment variable"
**Solution**: Set the required environment variables (see Step 2 above)

### Error: "Request blocked by security monitor"
**Solution**: You've exceeded the rate limit. Wait 1 minute and retry.

### Error: "Invalid path detected"
**Solution**: Ensure your file paths don't contain `../` or other traversal patterns.

## 📝 Migration Checklist

- [ ] Install v2.0.0 or later
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