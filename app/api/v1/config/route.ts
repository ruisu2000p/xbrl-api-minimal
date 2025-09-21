import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // MCP server configuration
    const config = {
      name: 'xbrl-financial',
      version: '3.2.0',
      description: 'XBRL Financial Data API MCP Server',
      // Required for MCP server to connect to Supabase
      supabaseUrl: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3FxaHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjgyNTYsImV4cCI6MjA3MjU0NDI1Nn0.y3P1TKex_pVOoGo9LjuLw2UzcRiC51T5sLKUqGV-ayI',
      tools: [
        'search-documents',
        'get-document',
        'search-companies'
      ],
      resources: [
        {
          uri: 'xbrl://documents',
          name: 'Financial Documents',
          mimeType: 'application/json'
        },
        {
          uri: 'xbrl://companies',
          name: 'Company Information',
          mimeType: 'application/json'
        }
      ],
      auth: {
        type: 'api-key',
        header: 'X-API-Key'
      },
      endpoints: {
        base: process.env.NEXT_PUBLIC_APP_URL || 'https://xbrl-api-minimal.vercel.app',
        api: '/api/v1',
        documents: '/api/v1/documents',
        companies: '/api/v1/companies'
      },
      capabilities: {
        search: true,
        filter: true,
        export: true,
        realtime: false
      },
      limits: {
        maxRequestsPerMinute: 100,
        maxResultsPerQuery: 100
      }
    };

    return NextResponse.json(config, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Config endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}