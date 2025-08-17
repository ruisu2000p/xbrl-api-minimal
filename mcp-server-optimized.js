#!/usr/bin/env node

/**
 * Optimized XBRL Financial Data MCP Server
 * With capacity constraint mitigation strategies
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
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';

// Optimized limits to prevent capacity constraints
const OPTIMAL_BATCH_SIZE = 500;  // Reduced from 1000 for stability
const MAX_PER_PAGE = 2000;  // Balanced limit
const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB - safer limit
const REQUEST_TIMEOUT = 30000; // 30 seconds - more reasonable
const RATE_LIMIT_DELAY = 200; // 200ms between requests

// Cache implementation for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create MCP server with optimized settings
const server = new Server(
  {
    name: 'xbrl-financial-data-optimized',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
      maxResponseSize: MAX_CONTENT_SIZE,
    },
  }
);

// Cache management
function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.error(`Cache hit for: ${key}`);
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// Optimized API request with caching
async function makeApiRequest(endpoint, params = {}, options = {}) {
  // Check cache first
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  const cached = getCached(cacheKey);
  if (cached && !options.skipCache) {
    return cached;
  }

  const url = new URL(`${API_URL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  const maxRetries = options.retries || 2; // Reduced retries
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Rate limiting
      if (i > 0 || options.rateLimit) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
      
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
      
      // Cache successful responses
      if (!options.skipCache) {
        setCache(cacheKey, data);
      }
      
      return data;
      
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        // Shorter backoff
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (i + 1), 5000)));
      }
    }
  }
  
  throw lastError;
}

// Optimized batch fetch with streaming
async function* batchFetchStream(endpoint, totalItems, batchSize = OPTIMAL_BATCH_SIZE) {
  const totalPages = Math.ceil(totalItems / batchSize);
  
  for (let page = 1; page <= totalPages; page++) {
    try {
      const data = await makeApiRequest(endpoint, {
        page,
        per_page: batchSize,
      }, {
        rateLimit: true,
      });
      
      let items = [];
      if (data.companies) {
        items = data.companies;
      } else if (data.data) {
        items = data.data;
      } else if (Array.isArray(data)) {
        items = data;
      }
      
      console.error(`Streamed page ${page}/${totalPages} (${items.length} items)`);
      yield items;
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      // Return empty array for failed pages
      yield [];
    }
  }
}

// Collect streamed data with size limit
async function collectStream(generator, maxItems = 10000) {
  const results = [];
  for await (const items of generator) {
    results.push(...items);
    if (results.length >= maxItems) {
      console.error(`Reached max items limit: ${maxItems}`);
      break;
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
        description: 'Search companies with optimized caching and rate limiting',
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
        name: 'get_companies_batch',
        description: 'Get companies in optimized batches (prevents capacity constraints)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum companies to fetch (default: 1000)',
              default: 1000,
            },
            offset: {
              type: 'number',
              description: 'Starting offset',
              default: 0,
            },
          },
        },
      },
      {
        name: 'get_company_details',
        description: 'Get company details with caching',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Company ID or ticker',
            },
            use_cache: {
              type: 'boolean',
              description: 'Use cached data if available',
              default: true,
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_financial_summary',
        description: 'Get lightweight financial summary (optimized for capacity)',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'Company ID or ticker',
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific fields to return (reduces payload)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'clear_cache',
        description: 'Clear the cache to free memory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_cache_status',
        description: 'Get current cache statistics',
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
              text: JSON.stringify({
                ...result,
                _cached: getCached(`/companies:${JSON.stringify({
                  search: args.search,
                  sector: args.sector,
                  page: args.page || 1,
                  per_page: perPage,
                })}`) ? true : false,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'get_companies_batch': {
        const limit = Math.min(args.limit || 1000, 5000);
        const offset = args.offset || 0;
        
        console.error(`Fetching batch: limit=${limit}, offset=${offset}`);
        
        // Calculate pagination
        const startPage = Math.floor(offset / OPTIMAL_BATCH_SIZE) + 1;
        const endPage = Math.ceil((offset + limit) / OPTIMAL_BATCH_SIZE);
        
        const companies = [];
        for (let page = startPage; page <= endPage; page++) {
          const data = await makeApiRequest('/companies', {
            page,
            per_page: OPTIMAL_BATCH_SIZE,
          }, {
            rateLimit: true,
          });
          
          if (data.companies) {
            companies.push(...data.companies);
          }
          
          if (companies.length >= limit) {
            break;
          }
        }
        
        // Trim to exact limit
        const trimmed = companies.slice(0, limit);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: trimmed.length,
                companies: trimmed,
                offset,
                limit,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'get_company_details': {
        const skipCache = args.use_cache === false;
        const result = await makeApiRequest(
          `/companies/${args.company_id}`,
          {},
          { skipCache }
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'get_financial_summary': {
        const result = await makeApiRequest(`/companies/${args.company_id}`);
        
        // Extract only requested fields
        let summary = result;
        if (args.fields && Array.isArray(args.fields)) {
          summary = {};
          for (const field of args.fields) {
            if (result[field] !== undefined) {
              summary[field] = result[field];
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }
      
      case 'clear_cache': {
        const size = cache.size;
        cache.clear();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Cache cleared',
                items_removed: size,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'get_cache_status': {
        const entries = [];
        for (const [key, value] of cache.entries()) {
          entries.push({
            key: key.substring(0, 50) + '...',
            age_seconds: Math.floor((Date.now() - value.timestamp) / 1000),
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                cache_size: cache.size,
                max_cache_size: 100,
                ttl_seconds: CACHE_TTL / 1000,
                entries: entries.slice(0, 10),
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
            suggestion: 'Try reducing the request size or using cached data',
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
  console.error('Optimized XBRL MCP Server started successfully');
  console.error(`API URL: ${API_URL}`);
  console.error(`Batch size: ${OPTIMAL_BATCH_SIZE}`);
  console.error(`Cache TTL: ${CACHE_TTL / 1000} seconds`);
  console.error('Capacity constraint mitigation: ENABLED');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});