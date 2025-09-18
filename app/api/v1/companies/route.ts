import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

export async function GET(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    // Create service client for API key validation
    const serviceClient = supabaseManager.getServiceClient()

    // Verify API key (Supabase handles hashing)
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_with_secret', {
        api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      console.error('API key verification failed:', keyError || authResult?.error)
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const companyName = searchParams.get('company_name')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Query companies from Supabase
    let query = serviceClient
      .from('company_master')
      .select('*')

    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`)
    }

    query = query.limit(limit)

    const { data: companies, error: companiesError } = await query

    if (companiesError) {
      console.error('Failed to fetch companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to fetch companies', details: companiesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: companies || [],
      count: companies?.length || 0,
      tier: authResult.tier // Include user's tier in response
    })

  } catch (error) {
    console.error('Companies API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    // Create service client
    const serviceClient = supabaseManager.getServiceClient()

    // Verify API key (Supabase handles hashing)
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_with_secret', {
        api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // Get search parameters from body
    const body = await request.json()
    const { company_name, doc_id, fiscal_year } = body

    // Build query
    let query = serviceClient
      .from('company_master')
      .select('*')

    if (company_name) {
      query = query.ilike('company_name', `%${company_name}%`)
    }

    if (doc_id) {
      query = query.eq('doc_id', doc_id)
    }

    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year)
    }

    const { data: companies, error: companiesError } = await query

    if (companiesError) {
      console.error('Failed to search companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to search companies' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: companies || [],
      count: companies?.length || 0,
      tier: authResult.tier
    })

  } catch (error) {
    console.error('Companies search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}