import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 環境変数のチェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Configuration error',
        message: 'Supabase environment variables not configured'
      }, { status: 500 });
    }

    // MCP server configuration
    const config = {
      name: 'xbrl-financial',
      version: '3.2.0',
      description: 'XBRL Financial Data API MCP Server',
      // Required for MCP server to connect to Supabase
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
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