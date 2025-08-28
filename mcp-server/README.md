# XBRL MCP Server

MCP (Model Context Protocol) server for accessing XBRL financial data through Claude Desktop and mobile apps.

## Installation

### Option 1: NPM Global Install (Recommended)
```bash
npm install -g xbrl-mcp-server
```

### Option 2: NPX (No installation needed)
```bash
npx xbrl-mcp-server --remote
```

### Option 3: GitHub Direct
```bash
npx github:ruisu2000p/xbrl-api-minimal#main --remote
```

## Configuration

Add to Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "xbrl-mobile": {
      "command": "npx",
      "args": ["xbrl-mcp-server", "--remote"],
      "env": {
        "XBRL_API_KEY": "your-api-key-here",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app"
      }
    }
  }
}
```

## Modes

- `--remote` : For mobile apps (iOS/Android)
- `--secure` : With API key authentication
- `--api` : Standard API mode (default)

## Getting API Key

1. Visit [XBRL API Dashboard](https://xbrl-api-minimal.vercel.app)
2. Create account or login
3. Copy your API key from dashboard

## Available Tools

### Basic Tools (Free)
- `search_companies` - Search companies by name or industry
- `get_company` - Get company details
- `get_documents` - List financial documents
- `read_document` - Read document content

### Premium Tools (API Key Required)
- `analyze_financial` - Analyze financial data
- `compare_companies` - Compare multiple companies

## License

MIT