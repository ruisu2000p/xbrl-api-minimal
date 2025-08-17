#!/usr/bin/env node

/**
 * Enhanced XBRL Financial Data MCP Server
 * With increased limits and batch processing support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// API Configuration with increased limits
const API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';

// Increased limits
const MAX_PER_PAGE = 5000;  // 増加
const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = 60000; // 60秒

// Create MCP server with enhanced capabilities
const server = new Server(
  {
    name: 'xbrl-financial-data-enhanced',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      maxResponseSize: MAX_CONTENT_SIZE,
    },
  }
);

// Enhanced API request function with retry logic
async function makeApiRequest(endpoint, params = {}, options = {}) {
  const url = new URL(`${API_URL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  const maxRetries = options.retries || 3;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Batch fetch function for large datasets
async function batchFetch(endpoint, totalItems, batchSize = 1000) {
  const results = [];
  const totalPages = Math.ceil(totalItems / batchSize);
  
  for (let page = 1; page <= totalPages; page++) {
    try {
      const data = await makeApiRequest(endpoint, {
        page,
        per_page: batchSize,
      });
      
      if (data.companies) {
        results.push(...data.companies);
      } else if (data.data) {
        results.push(...data.data);
      } else if (Array.isArray(data)) {
        results.push(...data);
      }
      
      // Progress indication
      console.error(`Fetched page ${page}/${totalPages} (${results.length} items)`);
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      // Continue with next page even if one fails
    }
  }
  
  return results;
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: 'Search for Japanese companies with enhanced limits (up to 5000 results)',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term (company name, ID, or ticker)',
            },
            sector: {
              type: 'string',
              description: 'Filter by sector',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            per_page: {
              type: 'number',
              description: `Results per page (default: 100, max: ${MAX_PER_PAGE})`,
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_all_companies',
        description: 'Get ALL companies in the database (4,231+ companies) - may take time',
        inputSchema: {
          type: 'object',
          properties: {
            include_fy2016: {
              type: 'boolean',
              description: 'Include FY2016 data (996 additional companies)',
              default: false,
            },
          },
        },
      },
      {
        name: 'get_company_details',
        description: 'Get detailed information including financial data for a specific company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Company ID or ticker',
            },
            include_documents: {
              type: 'boolean',
              description: 'Include document list',
              default: false,
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_financial_documents',
        description: 'Get financial document content for a company',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Company ID or ticker',
            },
            document_type: {
              type: 'string',
              description: 'Document type (e.g., "0101010_honbun", "0102010_honbun")',
            },
            fiscal_year: {
              type: 'string',
              description: 'Fiscal year (e.g., "FY2016", "FY2021")',
              default: 'FY2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'batch_search',
        description: 'Search multiple companies at once',
        inputSchema: {
          type: 'object',
          properties: {
            company_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of company IDs or tickers',
            },
          },
          required: ['company_ids'],
        },
      },
      {
        name: 'get_statistics',
        description: 'Get comprehensive database statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_companies': {
        const perPage = Math.min(args.per_page || 100, MAX_PER_PAGE);
        const result = await makeApiRequest('/companies', {
          search: args.search,
          sector: args.sector,
          page: args.page || 1,
          per_page: perPage,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'get_all_companies': {
        console.error('Fetching all companies... This may take a moment.');
        
        // First get the total count
        const stats = await makeApiRequest('/companies', {
          page: 1,
          per_page: 1,
        });
        
        const totalCompanies = stats.total || 4231;
        console.error(`Total companies to fetch: ${totalCompanies}`);
        
        // Batch fetch all companies
        const allCompanies = await batchFetch('/companies', totalCompanies, 500);
        
        // If include_fy2016 is true, fetch those as well
        if (args.include_fy2016) {
          console.error('Fetching FY2016 companies...');
          const fy2016 = await makeApiRequest('/companies', {
            search: 'FY2016',
            per_page: 1000,
          });
          if (fy2016.companies) {
            allCompanies.push(...fy2016.companies);
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: allCompanies.length,
                companies: allCompanies,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'get_company_details': {
        const companyResult = await makeApiRequest(`/companies/${args.company_id}`);
        
        let result = { company: companyResult };
        
        if (args.include_documents) {
          try {
            const docsResult = await makeApiRequest(`/companies/${args.company_id}/files`);
            result.documents = docsResult;
          } catch (error) {
            result.documents = { error: error.message };
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'get_financial_documents': {
        const endpoint = `/companies/${args.company_id}/files`;
        const params = {
          type: args.document_type,
          fiscal_year: args.fiscal_year,
        };
        
        const result = await makeApiRequest(endpoint, params);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'batch_search': {
        const results = [];
        
        for (const companyId of args.company_ids) {
          try {
            const result = await makeApiRequest('/companies', {
              search: companyId,
              per_page: 1,
            });
            
            if (result.companies && result.companies.length > 0) {
              results.push(result.companies[0]);
            }
          } catch (error) {
            results.push({ 
              id: companyId, 
              error: error.message 
            });
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                requested: args.company_ids.length,
                found: results.filter(r => !r.error).length,
                companies: results,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'get_statistics': {
        const [companies, fy2016] = await Promise.all([
          makeApiRequest('/companies', { page: 1, per_page: 1 }),
          makeApiRequest('/companies', { search: 'FY2016', per_page: 1 }),
        ]);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_companies: companies.total || 4231,
                fy2021_2022_companies: (companies.total || 4231) - (fy2016.total || 996),
                fy2016_companies: fy2016.total || 996,
                data_periods: ['2015-2016', '2021-2022'],
                api_version: '2.0.0',
                max_per_page: MAX_PER_PAGE,
              }, null, 2),
            },
          ],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: name,
            arguments: args,
          }, null, 2),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Enhanced XBRL MCP Server started successfully');
  console.error(`API URL: ${API_URL}`);
  console.error(`Max per page: ${MAX_PER_PAGE}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});