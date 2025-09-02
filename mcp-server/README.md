# xbrl-mcp-server v0.5.0

MCP (Model Context Protocol) Server for XBRL Financial Data API - Access Japanese listed companies financial data through Claude Desktop.

## 🆕 Latest Updates (v0.5.0 - 2025-09-02)
- **BFF統合**: Supabase Edge Functions BFF経由での安全なデータアクセス
- **Service Key不要**: 第三者ユーザーにService Keyを配布せずに利用可能
- **レート制限**: BFF側でAPIキーごとのレート制限を実施
- **互換性維持**: レガシーAPIモードも引き続きサポート

## 🚀 Quick Start

### 1. Install via npm

No manual installation needed! Just configure Claude Desktop to use npx.

### 2. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/claude/claude_desktop_config.json`

#### Option A: BFF Mode (推奨 - Service Key不要)
```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["xbrl-mcp-server@latest"],
      "env": {
        "XBRL_API_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-bff",
        "XBRL_API_KEY": "your_bff_api_key_here"
      }
    }
  }
}
```

#### Option B: Legacy Mode (Service Key必要)
```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["xbrl-mcp-server@latest"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "your_api_key_here",
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_SERVICE_KEY": "your_service_key_here"
      }
    }
  }
}
```

⚠️ **Important**: The package name is `xbrl-mcp-server`, not `@xbrl-jp/mcp-server`

### 3. Get Your API Key

Visit [https://xbrl-api-minimal.vercel.app](https://xbrl-api-minimal.vercel.app) to register and get your API key.

## 📊 Available Tools

### search_companies_by_name
Search for companies by name (日本語完全対応).

```
Parameters:
- company_name: Company name to search (e.g., "トヨタ自動車", "亀田製菓")
```

### get_company_documents
Retrieve financial documents from Supabase Storage.

```
Parameters:
- company_name: Company name (optional if company_id provided)
- company_id: Company ID (optional if company_name provided)
- fiscal_year: Fiscal year (e.g., "2023", "2024")
- include_content: Include document content (default: false)
```

### analyze_company_financials
Analyze financial metrics with automatic calculation.

```
Parameters:
- company_name: Company name (e.g., "トヨタ自動車")
- company_id: Company ID (optional)
- fiscal_year: Target fiscal year
- compare_previous_year: Compare with previous year (default: true)
```

### compare_companies
Compare multiple companies' financial data.

```
Parameters:
- company_names: Array of company names to compare
- fiscal_year: Fiscal year for comparison
- metrics: Metrics to compare (optional)
```

## 🔧 Environment Variables

### BFF Mode (推奨)
- `XBRL_API_URL`: BFF endpoint URL (e.g., `https://your-project.supabase.co/functions/v1/xbrl-bff`)
- `XBRL_API_KEY`: BFF API key for authentication

### Legacy Mode
- `XBRL_API_URL`: API endpoint URL (default: https://xbrl-api-minimal.vercel.app/api/v1)
- `XBRL_API_KEY`: Your API key (required for access)
- `SUPABASE_URL`: Supabase project URL (required for direct access)
- `SUPABASE_SERVICE_KEY`: Supabase service role key (required for direct access)

## 📋 Features

- Access to 4,231+ Japanese listed companies
- Financial data from 2021-2022 fiscal year
- Securities reports in Markdown format
- Real-time data retrieval
- Comprehensive financial metrics

## 🌐 Data Coverage

- **Companies**: 5,220+ Japanese listed companies
- **Period**: FY2015 - FY2024
- **Documents**: Securities reports (有価証券報告書)
- **Format**: Markdown (converted from XBRL)
- **Storage**: Supabase Storage + PostgreSQL metadata

## 📝 Example Usage in Claude Desktop

Once configured, you can ask Claude:

- "トヨタ自動車の財務分析をして" → Analyzes Toyota (S100OC13) financial data
- "亀田製菓の最新の有価証券報告書を表示" → Shows Kameda Seika's reports
- "ソニーのROEとROAを計算して" → Calculates Sony's financial ratios
- "トヨタ、ホンダ、日産を比較して" → Compares automotive companies

## 🆕 What's New in v0.5.0

### BFF (Backend for Frontend) Integration
The MCP server now supports connecting through a secure BFF layer that:
- **Eliminates Service Key exposure**: No need to share Supabase Service Keys with third-party users
- **Provides rate limiting**: Per-API-key rate limiting at the BFF level
- **Maintains compatibility**: Legacy mode still available for backward compatibility
- **Improves security**: All data access goes through a controlled API gateway

### How BFF Mode Works
1. MCP server connects to BFF Edge Function instead of directly to Supabase
2. BFF handles authentication with a simple API key
3. BFF manages all Supabase interactions with Service Role key
4. Rate limiting and logging are handled at the BFF level

## 🐛 Troubleshooting

### Error: Module export issue
If you see `SyntaxError: The requested module '../src/server.js' does not provide an export named 'main'`:
```bash
npx clear-npx-cache
npm install -g xbrl-mcp-server@latest
```

### Error: Company not found
If Japanese company names return no results:
- Update to v0.4.2 or later
- Clear npx cache
- Restart Claude Desktop

## 🔗 Links

- [API Documentation](https://xbrl-api-minimal.vercel.app/docs)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Get API Key](https://xbrl-api-minimal.vercel.app/register)

## 📄 License

MIT

## 🤝 Support

For issues or questions, please visit our [GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues).