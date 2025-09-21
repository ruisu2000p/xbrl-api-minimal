#!/usr/bin/env node
/**
 * XBRL Financial Data MCP Server
 * Provides secure access to financial data through Supabase
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

class XBRLFinancialMCPServer {
  constructor() {
    this.server = new Server({
      name: 'xbrl-financial',
      version: '1.0.0',
      description: 'XBRL Financial Data Access through Supabase'
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    // Initialize Supabase client
    this.initializeSupabase();

    // Register tools
    this.registerTools();

    // Register resources
    this.registerResources();
  }

  initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const apiKey = process.env.XBRL_API_KEY;

    if (!supabaseUrl || !apiKey) {
      throw new Error('SUPABASE_URL and XBRL_API_KEY environment variables are required');
    }

    this.supabase = createClient(supabaseUrl, apiKey);
  }

  /**
   * Validate API key using HMAC-SHA256
   */
  async validateApiKey(apiKey) {
    try {
      // API key format: xbrl_v1_[hash]
      if (!apiKey || !apiKey.startsWith('xbrl_v1_')) {
        return { valid: false, error: 'Invalid API key format' };
      }

      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Call Supabase function to validate
      const { data, error } = await this.supabase
        .rpc('validate_api_key_access', { key_hash: keyHash });

      if (error || !data || data.length === 0) {
        return { valid: false, error: 'Invalid or expired API key' };
      }

      return {
        valid: true,
        keyInfo: data[0]
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  registerTools() {
    // Search documents tool
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search-documents':
            return await this.searchDocuments(args);

          case 'get-document':
            return await this.getDocument(args);

          case 'list-companies':
            return await this.listCompanies(args);

          case 'get-company-info':
            return await this.getCompanyInfo(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });

    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'search-documents',
            description: 'Search financial documents by company name or ticker code',
            inputSchema: {
              type: 'object',
              properties: {
                company: {
                  type: 'string',
                  description: 'Company name or ticker code'
                },
                fiscal_year: {
                  type: 'string',
                  description: 'Fiscal year (e.g., FY2024)',
                  enum: ['FY2022', 'FY2023', 'FY2024', 'FY2025']
                },
                document_type: {
                  type: 'string',
                  description: 'Document type filter',
                  enum: ['PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'all'],
                  default: 'all'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results (default: 20)',
                  default: 20
                }
              },
              required: ['company']
            }
          },
          {
            name: 'get-document',
            description: 'Get financial document content',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Document path (e.g., FY2024/S100KLVZ/PublicDoc/file.md)'
                },
                max_size: {
                  type: 'number',
                  description: 'Maximum size in bytes (default: 1MB)',
                  default: 1000000
                }
              },
              required: ['path']
            }
          },
          {
            name: 'list-companies',
            description: 'List available companies',
            inputSchema: {
              type: 'object',
              properties: {
                fiscal_year: {
                  type: 'string',
                  description: 'Filter by fiscal year',
                  enum: ['FY2022', 'FY2023', 'FY2024', 'FY2025']
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results (default: 50)',
                  default: 50
                }
              }
            }
          },
          {
            name: 'get-company-info',
            description: 'Get detailed company information',
            inputSchema: {
              type: 'object',
              properties: {
                company_id: {
                  type: 'string',
                  description: 'Company ID (e.g., S100KLVZ)'
                }
              },
              required: ['company_id']
            }
          }
        ]
      };
    });
  }

  registerResources() {
    // List available resources
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: [
          {
            uri: 'xbrl://api-documentation',
            name: 'API Documentation',
            description: 'Complete API documentation for XBRL Financial Data',
            mimeType: 'text/markdown'
          },
          {
            uri: 'xbrl://fiscal-years',
            name: 'Available Fiscal Years',
            description: 'List of available fiscal years with document counts',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Read resource content
    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'xbrl://api-documentation':
          return {
            contents: [{
              uri,
              mimeType: 'text/markdown',
              text: this.getApiDocumentation()
            }]
          };

        case 'xbrl://fiscal-years':
          const fiscalYears = await this.getFiscalYears();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(fiscalYears, null, 2)
            }]
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  async searchDocuments(args) {
    const { company, fiscal_year, document_type = 'all', limit = 20 } = args;

    let query = this.supabase
      .from('markdown_files_metadata')
      .select('*');

    // Search by company name or ID
    if (company) {
      query = query.or(`company_name.ilike.%${company}%,company_id.ilike.%${company}%`);
    }

    // Filter by fiscal year
    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    // Filter by document type
    if (document_type !== 'all') {
      query = query.eq('file_type', document_type);
    }

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: data.length,
          documents: data.map(doc => ({
            id: doc.id,
            company_id: doc.company_id,
            company_name: doc.company_name,
            fiscal_year: doc.fiscal_year,
            file_type: doc.file_type,
            file_name: doc.file_name,
            storage_path: doc.storage_path,
            created_at: doc.created_at
          }))
        }, null, 2)
      }]
    };
  }

  async getDocument(args) {
    const { path, max_size = 1000000 } = args;

    // Get document metadata
    const { data: metadata, error: metaError } = await this.supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('storage_path', path)
      .single();

    if (metaError || !metadata) {
      throw new Error('Document not found');
    }

    // Download document content
    const { data, error } = await this.supabase.storage
      .from('markdown-files')
      .download(path);

    if (error) {
      throw new Error(`Storage error: ${error.message}`);
    }

    // Check size
    if (data.size > max_size) {
      throw new Error(`Document too large: ${data.size} bytes (max: ${max_size})`);
    }

    // Read content
    const content = await data.text();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          metadata,
          content: content.substring(0, max_size)
        }, null, 2)
      }]
    };
  }

  async listCompanies(args) {
    const { fiscal_year, limit = 50 } = args;

    let query = this.supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year')
      .limit(limit);

    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Unique companies
    const companies = {};
    data.forEach(row => {
      if (!companies[row.company_id]) {
        companies[row.company_id] = {
          company_id: row.company_id,
          company_name: row.company_name,
          fiscal_years: []
        };
      }
      if (!companies[row.company_id].fiscal_years.includes(row.fiscal_year)) {
        companies[row.company_id].fiscal_years.push(row.fiscal_year);
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: Object.keys(companies).length,
          companies: Object.values(companies)
        }, null, 2)
      }]
    };
  }

  async getCompanyInfo(args) {
    const { company_id } = args;

    // Get company master data
    const { data: companyData, error: companyError } = await this.supabase
      .from('company_master')
      .select('*')
      .eq('doc_id', company_id)
      .single();

    // Get all documents for this company
    const { data: documents, error: docsError } = await this.supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', company_id)
      .order('fiscal_year', { ascending: false });

    if (docsError) {
      throw new Error(`Database error: ${docsError.message}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          company: companyData || { doc_id: company_id },
          documents_count: documents.length,
          fiscal_years: [...new Set(documents.map(d => d.fiscal_year))],
          documents: documents.map(doc => ({
            fiscal_year: doc.fiscal_year,
            file_type: doc.file_type,
            file_name: doc.file_name,
            storage_path: doc.storage_path
          }))
        }, null, 2)
      }]
    };
  }

  async getFiscalYears() {
    const { data, error } = await this.supabase
      .from('markdown_files_metadata')
      .select('fiscal_year');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const yearCounts = {};
    data.forEach(row => {
      yearCounts[row.fiscal_year] = (yearCounts[row.fiscal_year] || 0) + 1;
    });

    return Object.entries(yearCounts).map(([year, count]) => ({
      fiscal_year: year,
      document_count: count
    }));
  }

  getApiDocumentation() {
    return `# XBRL Financial Data API

## Overview
This MCP server provides secure access to XBRL financial data stored in Supabase.

## Authentication
The server requires authentication through API keys. Set the following environment variables:
- \`SUPABASE_URL\`: Your Supabase project URL
- \`XBRL_API_KEY\`: Your API key for authentication

## Available Tools

### search-documents
Search for financial documents by company name or ticker code.

**Parameters:**
- \`company\` (required): Company name or ticker code
- \`fiscal_year\`: Filter by fiscal year (FY2022-FY2025)
- \`document_type\`: Filter by document type (PublicDoc, AuditDoc, all)
- \`limit\`: Maximum number of results (default: 20)

### get-document
Retrieve the content of a specific document.

**Parameters:**
- \`path\` (required): Document storage path
- \`max_size\`: Maximum content size in bytes (default: 1MB)

### list-companies
List all available companies in the database.

**Parameters:**
- \`fiscal_year\`: Filter by fiscal year
- \`limit\`: Maximum number of results (default: 50)

### get-company-info
Get detailed information about a specific company.

**Parameters:**
- \`company_id\` (required): Company ID (e.g., S100KLVZ)

## Data Structure
Documents are organized by:
- Fiscal Year (FY2022-FY2025)
- Company ID (8-character identifier)
- Document Type (PublicDoc, AuditDoc)

## Rate Limiting
The API enforces rate limits based on your subscription tier:
- Free: 100 requests per minute
- Basic: 1000 requests per minute
- Premium: Unlimited

## Support
For issues or questions, please contact the system administrator.
`;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('XBRL Financial MCP Server started');
  }
}

// Start the server
const server = new XBRLFinancialMCPServer();
server.start().catch(console.error);