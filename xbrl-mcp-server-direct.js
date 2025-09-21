#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server - Direct Supabase Connection
 * Version 4.2.0 - Enhanced with english_name search support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.XBRL_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class XBRLFinancialMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'xbrl-financial-mcp-server',
        version: '4.2.0',
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
                query: {
                  type: 'string',
                  description: 'Search query for company names (e.g., "Toyota", "トヨタ", "Sony", "ソニー")'
                },
                fiscal_year: {
                  type: 'string',
                  description: 'Filter by fiscal year (e.g., FY2024)',
                  pattern: '^FY\\d{4}$'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 100)',
                  default: 100
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_financial_files',
            description: 'Get financial document files for companies',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: 'Company ID to filter by'
                },
                fiscal_year: {
                  type: 'string',
                  description: 'Fiscal year to filter by (e.g., FY2024)',
                  pattern: '^FY\\d{4}$'
                },
                file_type: {
                  type: 'string',
                  description: 'Type of financial document',
                  enum: ['AuditDoc', 'PublicDoc']
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of files to return (default: 200)',
                  default: 200
                }
              }
            }
          },
          {
            name: 'get_file_content',
            description: 'Get the actual content of a financial document (Markdown file)',
            inputSchema: {
              type: 'object',
              properties: {
                storage_path: {
                  type: 'string',
                  description: 'The storage path of the file'
                },
                max_lines: {
                  type: 'number',
                  description: 'Maximum number of lines to return (default: 1000)',
                  default: 1000
                }
              },
              required: ['storage_path']
            }
          },
          {
            name: 'get_statistics',
            description: 'Get statistics about the XBRL database',
            inputSchema: {
              type: 'object',
              properties: {}
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

          case 'get_file_content':
            return await this.getFileContent(request.params.arguments);

          case 'get_statistics':
            return await this.getStatistics();

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
    const { query, fiscal_year, limit = 100 } = args;

    try {
      let queryBuilder = supabase
        .from('markdown_files_metadata')
        .select('company_id, company_name, english_name, fiscal_year')
        .or(`company_name.ilike.%${query}%,english_name.ilike.%${query}%`)
        .limit(limit);

      if (fiscal_year) {
        queryBuilder = queryBuilder.eq('fiscal_year', fiscal_year);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Group by company to avoid duplicates
      const companies = {};
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          if (item && item.company_id) {
            if (!companies[item.company_id]) {
              companies[item.company_id] = {
                company_id: item.company_id,
                company_name: item.company_name || `Company ${item.company_id}`,
                english_name: item.english_name || null,
                fiscal_years: []
              };
            }
            if (item.fiscal_year && !companies[item.company_id].fiscal_years.includes(item.fiscal_year)) {
              companies[item.company_id].fiscal_years.push(item.fiscal_year);
            }
          }
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              query: query,
              count: Object.keys(companies).length,
              companies: Object.values(companies),
              search_fields: ['company_name', 'english_name']
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Search error: ${error.message}`);
    }
  }

  async getFinancialFiles(args = {}) {
    const { company_id, fiscal_year, file_type, limit = 200 } = args;

    try {
      let queryBuilder = supabase
        .from('markdown_files_metadata')
        .select('*')
        .limit(limit);

      if (company_id) {
        queryBuilder = queryBuilder.eq('company_id', company_id);
      }
      if (fiscal_year) {
        queryBuilder = queryBuilder.eq('fiscal_year', fiscal_year);
      }
      if (file_type) {
        queryBuilder = queryBuilder.eq('file_type', file_type);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: data ? data.length : 0,
              files: data || []
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Files error: ${error.message}`);
    }
  }

  async getFileContent(args = {}) {
    const { storage_path, max_lines = 1000 } = args;

    if (!storage_path) {
      throw new Error('storage_path is required');
    }

    try {
      // Fix the storage path if needed
      let cleanPath = storage_path;
      if (cleanPath.startsWith('markdown-files/markdown-files/')) {
        cleanPath = cleanPath.replace('markdown-files/markdown-files/', 'markdown-files/');
      }

      // Download file from storage
      const { data, error } = await supabase
        .storage
        .from('markdown-files')
        .download(cleanPath.replace('markdown-files/', ''));

      if (error) throw error;

      // Convert blob to text
      const content = await data.text();

      // Limit the number of lines if requested
      let finalContent = content;
      if (max_lines && max_lines > 0) {
        const lines = content.split('\n');
        if (lines.length > max_lines) {
          finalContent = lines.slice(0, max_lines).join('\n') + `\n\n... (Truncated at ${max_lines} lines. Total: ${lines.length} lines)`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              storage_path: cleanPath,
              content_length: finalContent.length,
              content: finalContent
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`File content error: ${error.message}`);
    }
  }

  async getStatistics() {
    try {
      // Get total count
      const { count: totalFiles } = await supabase
        .from('markdown_files_metadata')
        .select('*', { count: 'exact', head: true });

      // Get unique companies
      const { data: companies } = await supabase
        .from('markdown_files_metadata')
        .select('company_id, company_name, english_name')
        .limit(1000);

      const uniqueCompanies = new Set(companies?.map(c => c.company_id) || []).size;

      // Get fiscal years
      const { data: years } = await supabase
        .from('markdown_files_metadata')
        .select('fiscal_year')
        .limit(1000);

      const fiscalYears = [...new Set(years?.map(y => y.fiscal_year).filter(Boolean) || [])].sort();

      // Count records with English names
      const { count: withEnglishNames } = await supabase
        .from('markdown_files_metadata')
        .select('*', { count: 'exact', head: true })
        .not('english_name', 'is', null);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              statistics: {
                total_files: totalFiles || 0,
                unique_companies: uniqueCompanies,
                fiscal_years: fiscalYears,
                records_with_english_names: withEnglishNames || 0,
                english_name_coverage: totalFiles > 0 ? ((withEnglishNames || 0) / totalFiles * 100).toFixed(2) + '%' : '0%',
                database_url: SUPABASE_URL,
                server_version: '4.2.0',
                features: ['Japanese name search', 'English name search', 'Multi-language support']
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Statistics error: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('XBRL Financial MCP Server v4.2.0 running (Direct Supabase Connection)');
  }
}

// Start the server
const server = new XBRLFinancialMCPServer();
server.run().catch(console.error);