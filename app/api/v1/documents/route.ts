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

    // Create service client
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
    const companyId = searchParams.get('company_id')
    const fiscalYear = searchParams.get('fiscal_year')
    const fileType = searchParams.get('file_type')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Query documents from markdown_files_metadata
    let query = serviceClient
      .from('markdown_files_metadata')
      .select('*')

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear)
    }

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    query = query.limit(limit).order('created_at', { ascending: false })

    const { data: documents, error: documentsError } = await query

    if (documentsError) {
      console.error('Failed to fetch documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: documentsError.message },
        { status: 500 }
      )
    }

    // Add public URL for each document
    const documentsWithUrls = documents?.map(doc => ({
      ...doc,
      public_url: doc.storage_path ?
        `https://wpwqxhyiglbtlaimrjrx.supabase.co/storage/v1/object/public/markdown-files/${doc.storage_path}` : null
    }))

    return NextResponse.json({
      success: true,
      data: documentsWithUrls || [],
      count: documentsWithUrls?.length || 0
    })

  } catch (error) {
    console.error('Documents API error:', error)
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
    const { company_name, company_id, fiscal_year, file_type } = body

    // Build query
    let query = serviceClient
      .from('markdown_files_metadata')
      .select('*')

    if (company_name) {
      query = query.ilike('company_name', `%${company_name}%`)
    }

    if (company_id) {
      query = query.eq('company_id', company_id)
    }

    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year)
    }

    if (file_type) {
      query = query.eq('file_type', file_type)
    }

    query = query.order('created_at', { ascending: false })

    const { data: documents, error: documentsError } = await query

    if (documentsError) {
      console.error('Failed to search documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to search documents' },
        { status: 500 }
      )
    }

    // Add public URL for each document
    const documentsWithUrls = documents?.map(doc => ({
      ...doc,
      public_url: doc.storage_path ?
        `https://wpwqxhyiglbtlaimrjrx.supabase.co/storage/v1/object/public/markdown-files/${doc.storage_path}` : null
    }))

    return NextResponse.json({
      success: true,
      data: documentsWithUrls || [],
      count: documentsWithUrls?.length || 0
    })

  } catch (error) {
    console.error('Documents search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}