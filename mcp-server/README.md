# XBRL Financial Data MCP Server

## Overview

XBRL Financial Data MCP Server provides secure access to Japanese financial documents stored in Supabase. This Model Context Protocol (MCP) server enables AI assistants to search, retrieve, and analyze XBRL financial data including annual reports (有価証券報告書) and audit documents.

## Features

- 🔒 **Secure Authentication**: API key-based authentication with HMAC-SHA256
- 📊 **Financial Data Access**: Search and retrieve XBRL documents in Markdown format
- 🎯 **Tier-based Access**: Free and premium subscription tiers
- ⚡ **Rate Limiting**: Automatic rate limiting based on subscription tier
- 🛡️ **Security**: SQL injection protection, suspicious activity detection
- 💾 **Caching**: Request caching for improved performance

## Installation

### As NPM Package

```bash
npm install -g shared-supabase-mcp-minimal
```

### From Source

```bash
git clone https://github.com/your-org/xbrl-mcp-server.git
cd xbrl-mcp-server/mcp-server
npm install
```

## Configuration

### Environment Variables

Set the following environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
XBRL_API_KEY=your-api-key-here

# Optional (for development)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### search-documents

Search for financial documents by company name or ticker code.

**Parameters:**
- `company` (required): Company name or ticker code
- `fiscal_year`: Filter by fiscal year (FY2022-FY2025)
- `document_type`: Filter by type (PublicDoc, AuditDoc, all)
- `limit`: Maximum results (default: 20)
- `offset`: Pagination offset (default: 0)

**Example:**
```json
{
  "tool": "search-documents",
  "arguments": {
    "company": "トヨタ",
    "fiscal_year": "FY2024",
    "document_type": "PublicDoc",
    "limit": 10
  }
}
```

### get-document

Retrieve the content of a specific document.

**Parameters:**
- `path` (required): Document storage path
- `max_size`: Maximum content size in bytes (default: 1MB)

**Example:**
```json
{
  "tool": "get-document",
  "arguments": {
    "path": "FY2024/hash123/PublicDoc_markdown/document.md",
    "max_size": 500000
  }
}
```

### list-companies

List all available companies in the database.

**Parameters:**
- `fiscal_year`: Filter by fiscal year
- `limit`: Maximum results (default: 50)
- `offset`: Pagination offset (default: 0)

**Example:**
```json
{
  "tool": "list-companies",
  "arguments": {
    "fiscal_year": "FY2024",
    "limit": 20
  }
}
```

### get-company-info

Get detailed information about a specific company.

**Parameters:**
- `company_id` (required): Company ID (e.g., S100KLVZ)

**Example:**
```json
{
  "tool": "get-company-info",
  "arguments": {
    "company_id": "S100KLVZ"
  }
}
```

## Available Resources

### API Documentation

```
xbrl://api-documentation
```

Complete API documentation in Markdown format.

### Fiscal Years

```
xbrl://fiscal-years
```

List of available fiscal years with document counts.

## Subscription Tiers

### Free Tier
- Access to FY2024 and FY2025 data only
- 100 requests per minute
- 1,000 requests per day
- API key expires in 30 days

### Basic Tier
- Access to all fiscal years (FY2022-FY2025)
- 1,000 requests per minute
- 50,000 requests per day
- API key expires in 90 days

### Premium Tier
- Access to all data
- 10,000 requests per minute
- 1,000,000 requests per day
- API key expires in 1 year

## Security Features

### Authentication
- API keys are validated using HMAC-SHA256
- Keys are stored as hashes in the database
- Automatic expiration based on tier

### Rate Limiting
- Per-minute and per-day limits based on tier
- Rate limit headers included in responses
- Automatic blocking of excessive requests

### Input Validation
- SQL injection protection
- Parameter type checking
- Input length limits
- Suspicious pattern detection

### Logging
- All API usage is logged
- Security events are tracked
- Performance metrics are recorded

## Testing

Run the test suite:

```bash
# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run tests
npm test
```

## Development

### Project Structure

```
mcp-server/
├── index.js          # Main server entry point
├── auth.js           # Authentication module
├── data-access.js    # Data access layer
├── middleware.js     # Middleware (rate limiting, validation)
├── test.js          # Test suite
├── package.json     # Package configuration
└── README.md        # This file
```

### Database Schema

The server expects the following Supabase tables:

- `markdown_files_metadata`: Document metadata
- `company_master`: Company information
- `company_directory_mapping`: Directory mappings
- `api_keys`: API key management
- `api_key_rate_limits`: Rate limit configuration
- `api_key_usage_logs`: Usage tracking
- `security_events`: Security event logs

### Storage Structure

Documents are stored in Supabase Storage:

```
markdown-files/
├── FY2022/
│   ├── {hashed_company_id}/
│   │   ├── PublicDoc_markdown/
│   │   └── AuditDoc_markdown/
├── FY2023/
├── FY2024/
└── FY2025/
```

## Troubleshooting

### Common Issues

#### "Invalid API key"
- Check that your API key starts with `xbrl_v1_`
- Verify the key hasn't expired
- Ensure the key is active in the database

#### "Rate limit exceeded"
- Wait for the rate limit window to reset (1 minute)
- Consider upgrading to a higher tier

#### "Document not found"
- Verify the storage path is correct
- Check if the document exists in storage
- Ensure you have access to the fiscal year

#### "Subscription required"
- Free tier only has access to FY2024 and FY2025
- Upgrade to Basic or Premium for full access

### Debug Mode

Enable debug logging:

```bash
DEBUG=xbrl:* npx shared-supabase-mcp-minimal
```

## Support

For issues or questions:
- GitHub Issues: [github.com/your-org/xbrl-mcp-server/issues](https://github.com/your-org/xbrl-mcp-server/issues)
- Documentation: [docs.xbrl-financial.com](https://docs.xbrl-financial.com)

## License

MIT License

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

Built with ❤️ for the Japanese financial data community