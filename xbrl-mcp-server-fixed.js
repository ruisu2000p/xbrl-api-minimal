#!/usr/bin/env node

// ===== Fixed MCP Server for XBRL Financial Data =====
// Properly accesses all companies in the database

import { createClient } from "@supabase/supabase-js";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Suppress console.log for protocol purity
console.log = (...args) => console.error('[LOG]', ...args);
console.error('[xbrl-mcp-server-fixed] Starting...');

// Get configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_KEY = process.env.XBRL_API_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('[ERROR] Missing XBRL_API_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize MCP server
const server = new Server({
  name: 'xbrl-mcp-server-fixed',
  version: '4.0.0'
}, {
  capabilities: {
    tools: {},
    prompts: {},
    resources: {}
  }
});

// Empty handlers for prompts and resources
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list-companies',
      description: 'List all available companies in the database',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of companies to return (default: 100)',
            default: 100
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination (default: 0)',
            default: 0
          }
        }
      }
    },
    {
      name: 'search-companies',
      description: 'Search for companies by name (partial match)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Company name to search for (partial match)'
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default: 20)',
            default: 20
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search-documents',
      description: 'Search financial documents by company name and fiscal year',
      inputSchema: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            description: 'Company name or ID'
          },
          fiscal_year: {
            type: 'string',
            description: 'Fiscal year (e.g., FY2024, FY2025)',
            enum: ['FY2024', 'FY2025']
          },
          document_type: {
            type: 'string',
            description: 'Document type filter',
            enum: ['PublicDoc', 'AuditDoc', 'all'],
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
            description: 'Document path (e.g., FY2024/S100KLVZ_xxx/PublicDoc_markdown/file.md)'
          }
        },
        required: ['path']
      }
    },
    {
      name: 'get-database-stats',
      description: 'Get database statistics',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

// Tool implementation handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  try {
    switch (toolName) {
      case 'list-companies': {
        const { limit = 100, offset = 0 } = args;

        console.error(`[DEBUG] Listing companies: limit=${limit}, offset=${offset}`);

        // Get distinct companies from markdown_files_metadata
        const { data, error } = await supabase
          .from('markdown_files_metadata')
          .select('company_id, company_name')
          .order('company_name')
          .range(offset, offset + limit - 1);

        if (error) throw new Error(error.message);

        // Deduplicate by company_id
        const uniqueCompanies = Array.from(
          new Map(data.map(item => [item.company_id, item])).values()
        );

        // Get counts for each company
        const companiesWithCounts = await Promise.all(
          uniqueCompanies.slice(0, limit).map(async (company) => {
            const { count } = await supabase
              .from('markdown_files_metadata')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', company.company_id);

            return {
              ...company,
              document_count: count || 0
            };
          })
        );

        const output = `Found ${companiesWithCounts.length} companies:\n\n` +
          companiesWithCounts.map(c =>
            `- ${c.company_name} (ID: ${c.company_id}, ${c.document_count} documents)`
          ).join('\n');

        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      case 'search-companies': {
        const { query, limit = 20 } = args;

        console.error(`[DEBUG] Searching for companies: query="${query}"`);

        // Search in markdown_files_metadata directly
        const { data, error } = await supabase
          .from('markdown_files_metadata')
          .select('company_id, company_name, fiscal_year')
          .ilike('company_name', `%${query}%`)
          .limit(limit * 2); // Get more to deduplicate

        if (error) throw new Error(error.message);

        // Group by company
        const companies = {};
        for (const doc of data) {
          if (!companies[doc.company_id]) {
            companies[doc.company_id] = {
              company_id: doc.company_id,
              company_name: doc.company_name,
              fiscal_years: new Set()
            };
          }
          companies[doc.company_id].fiscal_years.add(doc.fiscal_year);
        }

        const results = Object.values(companies).slice(0, limit);

        const output = `Found ${results.length} companies matching "${query}":\n\n` +
          results.map(c =>
            `- ${c.company_name} (ID: ${c.company_id}, Years: ${Array.from(c.fiscal_years).sort().join(', ')})`
          ).join('\n');

        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      case 'search-documents': {
        const { company, fiscal_year, document_type = 'all', limit = 20 } = args;

        console.error(`[DEBUG] Searching documents: company="${company}", year="${fiscal_year}", type="${document_type}"`);

        let query = supabase
          .from('markdown_files_metadata')
          .select('*');

        // Search by company name or ID
        if (company.startsWith('S100')) {
          query = query.eq('company_id', company);
        } else {
          query = query.ilike('company_name', `%${company}%`);
        }

        // Filter by fiscal year
        if (fiscal_year) {
          query = query.eq('fiscal_year', fiscal_year);
        }

        // Filter by document type
        if (document_type !== 'all') {
          query = query.ilike('storage_path', `%${document_type}%`);
        }

        query = query
          .order('fiscal_year', { ascending: false })
          .order('file_name')
          .limit(limit);

        const { data: documents, error } = await query;

        if (error) throw new Error(error.message);

        if (!documents || documents.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No documents found for: ${company}`
            }]
          };
        }

        // Format results
        let output = `Found ${documents.length} documents:\n\n`;

        // Group by fiscal year
        const byYear = {};
        for (const doc of documents) {
          if (!byYear[doc.fiscal_year]) {
            byYear[doc.fiscal_year] = [];
          }
          byYear[doc.fiscal_year].push(doc);
        }

        for (const [year, docs] of Object.entries(byYear)) {
          output += `## ${year} - ${docs[0].company_name}\n`;
          for (const doc of docs) {
            output += `- ${doc.file_name}\n`;
            output += `  Path: ${doc.storage_path}\n`;
          }
          output += '\n';
        }

        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      case 'get-document': {
        const { path } = args;

        console.error(`[DEBUG] Getting document: ${path}`);

        // Validate path
        if (!path || path.includes('..')) {
          throw new Error('Invalid document path');
        }

        // Get document from storage
        const { data, error } = await supabase.storage
          .from('markdown-files')
          .download(path);

        if (error) throw new Error(error.message);

        const text = await data.text();

        return {
          content: [{
            type: 'text',
            text: text.substring(0, 100000) // Limit to 100KB
          }]
        };
      }

      case 'get-database-stats': {
        console.error('[DEBUG] Getting database stats');

        const { data, error } = await supabase.rpc('execute_sql', {
          query: `
            SELECT
              COUNT(DISTINCT company_id) as total_companies,
              COUNT(DISTINCT company_name) as unique_company_names,
              COUNT(*) as total_documents,
              COUNT(DISTINCT fiscal_year) as fiscal_years,
              STRING_AGG(DISTINCT fiscal_year::text, ', ' ORDER BY fiscal_year) as available_years
            FROM markdown_files_metadata
          `
        });

        if (error) throw new Error(error.message);

        const stats = data.data[0];

        const output = `Database Statistics:

- Total Companies: ${stats.total_companies}
- Unique Company Names: ${stats.unique_company_names}
- Total Documents: ${stats.total_documents}
- Fiscal Years: ${stats.fiscal_years}
- Available Years: ${stats.available_years}

Note: The database contains financial documents for ${stats.total_companies} companies across ${stats.fiscal_years} fiscal years.`;

        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`[ERROR] Tool ${toolName} failed:`, error.message);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('[xbrl-mcp-server-fixed] Server started successfully');
});