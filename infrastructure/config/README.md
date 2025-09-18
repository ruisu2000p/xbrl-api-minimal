# Configuration Directory

This directory contains configuration files for the XBRL API application.

## Files

- `claude-mcp-config.json` - MCP (Model Context Protocol) configuration for Claude integration (not tracked in git for security reasons)

## Setup

To set up the MCP configuration:

1. Create a `claude-mcp-config.json` file in this directory
2. Use the following template:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "XBRL_API_KEY": "your-api-key-here",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

3. Replace `your-api-key-here` with your actual API key

## Security

The actual configuration files containing API keys are excluded from version control for security reasons.