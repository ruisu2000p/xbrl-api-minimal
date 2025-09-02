# XBRL BFF (Backend for Frontend) Edge Function

Secure API gateway for XBRL financial data access without exposing Supabase Service Keys.

## 🎯 Purpose

This BFF provides a secure API layer that:
- **Protects Service Keys**: Third-party users never receive Supabase Service Keys
- **Simple Integration**: MCP clients only need `XBRL_API_URL` and `XBRL_API_KEY`
- **Rate Limiting**: Per-API-key rate limiting with token bucket algorithm
- **Structured Logging**: JSON logs with company IDs, counts, duration, and masked API keys

## 📋 API Endpoints

### 1. Search Company
```bash
GET /search-company?q={query}&limit={limit}
```
- **Parameters**:
  - `q` (required): Company name to search (e.g., "トヨタ", "亀田製菓")
  - `limit` (optional): Max results (default: 20, max: 100)
- **Response**: Array of `{company_id, company_name}`

### 2. List Markdown Files
```bash
GET /list-md?company_id={id}&fiscal_year={year}
```
- **Parameters**:
  - `company_id` (required): Company identifier (e.g., "S100OC13")
  - `fiscal_year` (optional): Filter by year (e.g., "2023")
- **Response**: Array of `{path, size, last_modified}`

### 3. Get Markdown Content
```bash
GET /get-md?path={path}
```
- **Parameters**:
  - `path` (required): Full path to .md file
- **Response**: `{path, content, size}`

## 🚀 Deployment

### Prerequisites
- Supabase CLI installed
- Supabase project created
- Service Role key from Supabase dashboard

### Step 1: Configure Environment Variables
```bash
# Set required secrets
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_KEY="your-service-role-key"
supabase secrets set BFF_API_KEY="your-secure-api-key"

# Set rate limits (optional)
supabase secrets set RATE_LIMIT_RPS="5"
supabase secrets set RATE_LIMIT_BURST="10"
```

### Step 2: Deploy Function
```bash
# Deploy to Supabase
supabase functions deploy xbrl-bff

# Get deployment URL
supabase functions list
```

### Step 3: Test Deployment
```bash
# Set your API key
export BFF_API_KEY="your-secure-api-key"
export BFF_URL="https://your-project.supabase.co/functions/v1/xbrl-bff"

# Test search
curl -H "x-api-key: $BFF_API_KEY" \
  "$BFF_URL/search-company?q=トヨタ"

# Test list files
curl -H "x-api-key: $BFF_API_KEY" \
  "$BFF_URL/list-md?company_id=S100OC13&fiscal_year=2023"

# Test get content
curl -H "x-api-key: $BFF_API_KEY" \
  "$BFF_URL/get-md?path=S100OC13/PublicDoc_markdown/0101010_honbun.md"
```

## 🔧 Local Development

### Setup
```bash
# Start Supabase locally
supabase start

# Set environment variables
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_KEY="your-local-service-key"
export BFF_API_KEY="test-api-key"
export RATE_LIMIT_RPS="10"
export RATE_LIMIT_BURST="20"
```

### Run Locally
```bash
# Serve function locally
supabase functions serve xbrl-bff --env-file .env.local

# Test locally
curl -H "x-api-key: test-api-key" \
  "http://localhost:54321/functions/v1/xbrl-bff/search-company?q=トヨタ"
```

## 📊 Rate Limiting

The BFF implements token bucket rate limiting:
- **RPS (Requests Per Second)**: Configurable via `RATE_LIMIT_RPS` (default: 5)
- **Burst**: Maximum burst capacity via `RATE_LIMIT_BURST` (default: 10)
- **Per API Key**: Each API key has its own rate limit bucket
- **429 Response**: Returns `Retry-After` header when rate limited

## 📝 Logging

Structured JSON logs include:
- **Request Info**: Method, path, parameters
- **Performance**: Response time in milliseconds
- **Security**: Masked API keys (first 8 chars + last 4)
- **Results**: Count of returned items, company IDs
- **Errors**: Detailed error messages with context

Example log entry:
```json
{
  "event": "api_request",
  "method": "GET",
  "pathname": "/search-company",
  "params": {"q": "トヨタ", "limit": 20},
  "api_key": "xbrl_liv...1k8q",
  "status": 200,
  "duration_ms": 145,
  "result_count": 1,
  "timestamp": "2025-09-02T10:30:00Z"
}
```

## 🔐 Security

- **API Key Authentication**: Required `x-api-key` header
- **No Service Key Exposure**: Service keys never leave the server
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: All parameters validated and sanitized
- **Error Masking**: Internal errors don't leak sensitive information

## 📚 Client Integration

### MCP Server Configuration
```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["xbrl-mcp-server@latest"],
      "env": {
        "XBRL_API_URL": "https://your-project.supabase.co/functions/v1/xbrl-bff",
        "XBRL_API_KEY": "your-bff-api-key"
      }
    }
  }
}
```

### JavaScript/TypeScript Client
```typescript
const API_URL = 'https://your-project.supabase.co/functions/v1/xbrl-bff';
const API_KEY = 'your-bff-api-key';

// Search companies
const response = await fetch(`${API_URL}/search-company?q=トヨタ`, {
  headers: { 'x-api-key': API_KEY }
});
const companies = await response.json();

// Get markdown content
const mdResponse = await fetch(
  `${API_URL}/get-md?path=${encodeURIComponent(path)}`,
  { headers: { 'x-api-key': API_KEY } }
);
const { content } = await mdResponse.json();
```

## 🧪 Testing

### Unit Tests
```bash
# Run tests
deno test --allow-env --allow-net
```

### Integration Tests
See `test/integration.test.ts` for full test suite.

### Load Testing
```bash
# Install hey (HTTP load generator)
brew install hey

# Test rate limiting
hey -n 100 -c 10 -H "x-api-key: $BFF_API_KEY" \
  "$BFF_URL/search-company?q=test"
```

## 📈 Monitoring

### Supabase Dashboard
- View logs in Supabase Dashboard > Functions > Logs
- Monitor invocations, errors, and performance

### Custom Metrics
The BFF logs can be ingested into monitoring systems:
- Parse JSON logs for metrics
- Track API usage per key
- Monitor error rates and response times

## 🔄 Future Enhancements

1. **Multi-tenant API Keys**: Store multiple API keys in database
2. **Usage Quotas**: Monthly/daily limits per API key
3. **Caching Layer**: Redis/memory cache for frequent queries
4. **Webhook Support**: Push notifications for data updates
5. **GraphQL Interface**: Alternative to REST API

## 📄 License

MIT

## 🤝 Support

For issues or questions, please open an issue on GitHub.