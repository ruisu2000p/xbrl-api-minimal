# XBRL Financial Data API Documentation

## Base URL
```
Production: https://xbrl-api-minimal.vercel.app
Development: http://localhost:3000
```

## Authentication
All API endpoints require an API key to be included in the request headers:

```
X-API-Key: xbrl_demo
```

## Rate Limiting
- 60 requests per minute per API key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### 1. Get Companies List
**GET** `/api/v1/companies`

Retrieve a paginated list of companies.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| per_page | integer | 20 | Items per page |
| search | string | - | Search by company name or ticker |
| sector | string | - | Filter by sector |
| fiscal_year | string | 2024 | Filter by fiscal year |

#### Response
```json
{
  "data": [
    {
      "company_id": "S100TIJL",
      "company_name": "トヨタ自動車株式会社",
      "ticker_code": "7203",
      "sector": "自動車",
      "fiscal_year": "2024"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 4231,
    "total_pages": 212
  },
  "status": 200
}
```

### 2. Get Company Data
**GET** `/api/v1/companies/{id}/data`

Retrieve detailed financial data and storage files for a specific company.

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Company ID or ticker code |

#### Response
```json
{
  "data": {
    "company": {
      "company_id": "S100TIJL",
      "company_name": "トヨタ自動車株式会社",
      "ticker_code": "7203",
      "sector": "自動車",
      "fiscal_year": "2024"
    },
    "files": [
      {
        "name": "0101010_honbun.md",
        "size": 123456,
        "url": "https://...",
        "lastModified": "2024-01-01T00:00:00Z"
      }
    ],
    "metadata": {
      "total_files": 10,
      "storage_path": "markdown-files/FY2024/S100TIJL/PublicDoc"
    }
  },
  "status": 200
}
```

### 3. Get Markdown Documents
**GET** `/api/v1/markdown-documents`

Retrieve markdown document content directly.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| company_id | string | Yes | Company ID |
| fiscal_year | string | No | Fiscal year (default: 2024) |
| document_type | string | No | PublicDoc or AuditDoc (default: PublicDoc) |
| file_name | string | No | Specific file name |

#### Response
```json
{
  "data": {
    "company_id": "S100TIJL",
    "fiscal_year": "2024",
    "document_type": "PublicDoc",
    "file_path": "markdown-files/FY2024/S100TIJL/PublicDoc/0101010_honbun.md",
    "content": "# 第一部 【企業情報】\n...",
    "size": 123456
  },
  "status": 200
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "status": 400,
  "details": {} // Optional additional error details
}
```

### Common Error Codes
| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## TypeScript Types

```typescript
interface Company {
  company_id: string;
  company_name: string;
  ticker_code?: string;
  sector?: string;
  market?: string;
  fiscal_year: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sector?: string;
  fiscal_year?: string;
}
```

## Examples

### JavaScript/TypeScript
```javascript
const response = await fetch('https://xbrl-api-minimal.vercel.app/api/v1/companies', {
  headers: {
    'X-API-Key': 'xbrl_demo'
  }
});
const data = await response.json();
```

### cURL
```bash
curl -H "X-API-Key: xbrl_demo" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies
```

### Python
```python
import requests

headers = {'X-API-Key': 'xbrl_demo'}
response = requests.get(
  'https://xbrl-api-minimal.vercel.app/api/v1/companies',
  headers=headers
)
data = response.json()
```