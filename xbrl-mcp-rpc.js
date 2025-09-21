#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server - RPC Version
 * Version 5.0.0 - Using RPC functions for search
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_ANON_KEY = process.env.XBRL_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

// Helper function to call RPC
async function callRPC(functionName, params = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RPC call failed: ${response.status} - ${error}`);
  }

  return response.json();
}

class XBRLFinancialMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'xbrl-financial-mcp-server',
        version: '5.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_companies',
            description: 'Search companies by name (supports both Japanese and English names)',
            inputSchema: {
              type: 'object',
              properties: {
                company_name: {
                  type: 'string',
                  description: 'Company name to search for (e.g., "Toyota", "トヨタ", "Sony", "ソニー")'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 50)',
                  default: 50
                }
              },
              required: ['company_name']
            }
          },
          {
            name: 'get_financial_files',
            description: 'Get financial files for a specific company',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: 'Company ID'
                },
                fiscal_year: {
                  type: 'string',
                  description: 'Fiscal year (e.g., FY2024)'
                },
                file_type: {
                  type: 'string',
                  description: 'File type filter',
                  enum: ['AuditDoc', 'PublicDoc']
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of files (default: 100)',
                  default: 100
                }
              },
              required: ['company_id']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_companies':
            return await this.searchCompanies(request.params.arguments);

          case 'get_financial_files':
            return await this.getFinancialFiles(request.params.arguments);

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async searchCompanies(args = {}) {
    const { company_name, limit = 50 } = args;

    try {
      // Use the new RPC function with English name support
      const data = await callRPC('search_markdown_with_english', {
        p_query: company_name
      });

      // Group by company
      const companies = {};
      if (data && Array.isArray(data)) {
        data.slice(0, limit).forEach(item => {
          if (item && item.company_id) {
            if (!companies[item.company_id]) {
              companies[item.company_id] = {
                company_id: item.company_id,
                company_name: item.company_name,
                english_name: item.english_name || null,
                fiscal_years: [],
                file_count: 0
              };
            }
            if (item.fiscal_year && !companies[item.company_id].fiscal_years.includes(item.fiscal_year)) {
              companies[item.company_id].fiscal_years.push(item.fiscal_year);
            }
            companies[item.company_id].file_count++;
          }
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              query: company_name,
              count: Object.keys(companies).length,
              companies: Object.values(companies),
              total_files: data ? data.length : 0
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Search error: ${error.message}`);
    }
  }

  async getFinancialFiles(args = {}) {
    const { company_id, fiscal_year, file_type, limit = 100 } = args;

    try {
      // Get all files for the company
      const data = await callRPC('search_markdown_with_english', {
        p_query: company_id
      });

      // Filter results
      let files = data || [];
      if (fiscal_year) {
        files = files.filter(f => f.fiscal_year === fiscal_year);
      }
      if (file_type) {
        files = files.filter(f => f.file_type === file_type);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              company_id: company_id,
              count: files.slice(0, limit).length,
              files: files.slice(0, limit)
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Files error: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('XBRL Financial MCP Server v5.0.0 (RPC Version) running');
  }
}

// Start the server
const server = new XBRLFinancialMCPServer();
server.run().catch(console.error);