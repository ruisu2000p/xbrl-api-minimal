# @xbrl-jp/mcp-server v0.5.0

MCP (Model Context Protocol) Server for XBRL Financial Data API - Access Japanese listed companies financial data through Claude Desktop with secure API key authentication.

## 🆕 Updates in v0.5.0
- **APIキー認証**: セキュアなAPIキー認証機能を実装
- **デュアルモード**: Vercel APIとSupabase直接アクセスの両方をサポート
- **第三者利用対応**: 各ユーザーが自分のAPIキーで利用可能
- **レート制限管理**: プラン別のレート制限を実装
- **エラーハンドリング改善**: より詳細なエラーメッセージ

## 🔑 API Key Authentication
- **無料プラン**: 100,000リクエスト/日
- **プレミアムプラン**: 1,000,000リクエスト/日 + Supabase直接アクセス
- **エンタープライズ**: 無制限アクセス + 専任サポート

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
        "XBRL_API_KEY": "your_api_key_here",
        "API_MODE": "vercel"
      }
    }
  }
}
```

### 3. Get Your API Key

1. Visit [https://xbrl-api-minimal.vercel.app/dashboard](https://xbrl-api-minimal.vercel.app/dashboard)
2. Create an account or login
3. Generate your API key from the dashboard
4. Copy the key (format: `xbrl_live_xxxxx`)

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