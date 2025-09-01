# @xbrl-jp/mcp-server v0.2.0

MCP (Model Context Protocol) Server for XBRL Financial Data API - Access Japanese listed companies financial data through Claude Desktop.

## 🆕 Updates in v0.2.0
- Support for markdown_files_metadata table with 100,000+ documents
- Direct Supabase Storage integration for file retrieval
- Improved Japanese company name search
- Enhanced error handling and performance

## 🚀 Quick Start

### 1. Install via npm

No manual installation needed! Just configure Claude Desktop to use npx.

### 2. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. Get Your API Key

Visit [https://xbrl-api-minimal.vercel.app](https://xbrl-api-minimal.vercel.app) to register and get your API key.

## 📊 Available Tools

### search_companies
Search for Japanese listed companies by name, ticker, or industry.

```
Parameters:
- query: Search term (company name, ticker code, etc.)
- industry: Filter by industry
- limit: Maximum number of results (default: 10)
```

### get_company
Get detailed information about a specific company.

```
Parameters:
- company_id: Company ID or ticker code
```

### get_financial_data
Retrieve financial statements and metrics.

```
Parameters:
- company_id: Company ID or ticker code
- fiscal_year: Fiscal year (e.g., "2021")
- doc_type: Document type ("securities_report", "quarterly_report", etc.)
```

## 🔧 Environment Variables

- `XBRL_API_URL`: API endpoint URL (default: https://xbrl-api-minimal.vercel.app/api/v1)
- `XBRL_API_KEY`: Your API key (required for access)

## 📋 Features

- Access to 4,231+ Japanese listed companies
- Financial data from 2021-2022 fiscal year
- Securities reports in Markdown format
- Real-time data retrieval
- Comprehensive financial metrics

## 🌐 Data Coverage

- **Companies**: 4,231 Japanese listed companies
- **Period**: April 2021 - March 2022
- **Documents**: Securities reports (有価証券報告書)
- **Format**: Converted from XBRL to Markdown

## 📝 Example Usage in Claude

Once configured, you can ask Claude:

- "Search for Toyota's financial data"
- "Show me Nintendo's latest securities report"
- "Find technology companies in Japan"
- "Get the financial metrics for company 7203"

## 🔗 Links

- [API Documentation](https://xbrl-api-minimal.vercel.app/docs)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Get API Key](https://xbrl-api-minimal.vercel.app/register)

## 📄 License

MIT

## 🤝 Support

For issues or questions, please visit our [GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues).