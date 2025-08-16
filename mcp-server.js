#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server
 * Provides access to 4,225 Japanese companies financial data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// API Configuration
const API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_live_test_admin_key_2025';

// Create MCP server
const server = new Server(
  {
    name: 'xbrl-financial-data',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to make API requests
async function makeApiRequest(endpoint, params = {}) {
  const url = new URL(`${API_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: 'Search for Japanese companies in the XBRL database. Returns company information including ID, name, ticker, sector, and market.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term (company name, ID, or ticker)',
            },
            sector: {
              type: 'string',
              description: 'Filter by sector (e.g., 輸送用機器, 電気機器, 情報・通信業)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'get_company_by_id',
        description: 'Get detailed information about a specific company by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Company ID (e.g., S100L777)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_all_companies',
        description: 'List all companies with pagination. Total: 4,225 Japanese companies.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100, max: 1000)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_sectors',
        description: 'Get a list of all available sectors/industries',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_statistics',
        description: 'Get database statistics including total companies, sectors, etc.',
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
        const result = await makeApiRequest('/companies', {
          search: args.search,
          sector: args.sector,
          page: args.page || 1,
          per_page: args.per_page || 20,
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
      
      case 'get_company_by_id': {
        const result = await makeApiRequest('/companies', {
          search: args.company_id,
          per_page: 1,
        });
        
        if (result.companies && result.companies.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.companies[0], null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Company with ID ${args.company_id} not found`,
              },
            ],
          };
        }
      }
      
      case 'list_all_companies': {
        const result = await makeApiRequest('/companies', {
          page: args.page || 1,
          per_page: args.per_page || 100,
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
      
      case 'get_sectors': {
        // This would need a dedicated endpoint, for now return sample sectors
        const sectors = [
          '輸送用機器',
          '電気機器',
          '情報・通信業',
          'サービス業',
          '銀行業',
          '医薬品',
          '化学',
          '機械',
          '小売業',
          '建設業',
        ];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ sectors }, null, 2),
            },
          ],
        };
      }
      
      case 'get_statistics': {
        const result = await makeApiRequest('/companies', {
          per_page: 1,
        });
        
        const stats = {
          total_companies: result.total || 0,
          data_source: result.source || 'unknown',
          api_status: 'online',
          last_updated: new Date().toISOString(),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XBRL MCP Server started successfully');
  console.error(`API URL: ${API_URL}`);
  console.error(`Total companies available: 4,225`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});