import { NextRequest, NextResponse } from 'next/server'

/**
 * MCP Server Configuration Endpoint
 * MCPサーバーが初期化時に設定を取得するためのエンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    // MCPサーバー用の設定情報を返す
    const config = {
      version: '3.4.0',
      service: 'xbrl-financial',
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      features: {
        search_documents: true,
        get_document_content: true,
        company_search: true,
        fiscal_year_filter: true,
        document_type_filter: true
      },
      supported_fiscal_years: ['FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'],
      supported_document_types: ['PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'AuditDoc_markdown'],
      rate_limits: {
        requests_per_minute: 100,
        max_documents_per_request: 20
      },
      metadata: {
        provider: 'XBRL Financial API',
        environment: process.env.NODE_ENV || 'production',
        api_version: 'v1'
      }
    }

    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
      }
    })
  } catch (error) {
    console.error('Config endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// OPTIONSメソッドのサポート（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    }
  })
}