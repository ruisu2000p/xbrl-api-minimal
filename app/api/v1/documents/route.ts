import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { UnifiedInputValidator } from '@/lib/validators/unified-input-validator'
import { withSecurity } from '@/lib/middleware/security-middleware'
import { z } from 'zod'

// このルートは動的である必要があります（request.headersを使用）
export const dynamic = 'force-dynamic'

async function handleGetRequest(request: Request) {
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

    // Verify API key with bcrypt (Supabase handles everything)
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_bcrypt', {
        p_api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      console.error('API key verification failed:', keyError || authResult?.error)
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // Secure input validation and sanitization
    const url = new URL(request.url)
    const searchParams = url.searchParams
    let validatedParams: {
      companyId: string | null
      fiscalYear: string | null
      fileType: string | null
      limit: number
    }

    try {
      validatedParams = {
        companyId: searchParams.get('company_id') ?
          UnifiedInputValidator.validateString(searchParams.get('company_id'), { maxLength: 20 }) : null,
        fiscalYear: searchParams.get('fiscal_year') ?
          UnifiedInputValidator.validateFiscalYear(searchParams.get('fiscal_year')) : null,
        fileType: searchParams.get('file_type') ?
          UnifiedInputValidator.validateString(searchParams.get('file_type'), { maxLength: 50 }) : null,
        limit: UnifiedInputValidator.validateNumericInput(
          searchParams.get('limit'),
          { min: 1, max: 100, defaultValue: 20 }
        ) as number
      }

      // Validate company ID format if provided
      if (validatedParams.companyId) {
        validatedParams.companyId = UnifiedInputValidator.validateCompanyId(validatedParams.companyId);
      }
    } catch (error) {
      console.warn('Input validation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: Object.fromEntries(searchParams.entries())
      })

      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          message: error instanceof Error ? error.message : 'Validation failed'
        },
        { status: 400 }
      )
    }

    // Query documents from markdown_files_metadata
    let query = serviceClient
      .from('markdown_files_metadata')
      .select('*')

    if (validatedParams.companyId) {
      query = query.eq('company_id', validatedParams.companyId)
    }

    if (validatedParams.fiscalYear) {
      query = query.eq('fiscal_year', validatedParams.fiscalYear)
    }

    if (validatedParams.fileType) {
      query = query.eq('file_type', validatedParams.fileType)
    }

    query = query.limit(validatedParams.limit).order('created_at', { ascending: false })

    const { data: documents, error: documentsError } = await query

    if (documentsError) {
      console.error('Failed to fetch documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: documentsError.message },
        { status: 500 }
      )
    }

    // Add public URL for each document
    // 環境変数から取得、設定されていない場合はエラー
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    const documentsWithUrls = documents?.map(doc => ({
      ...doc,
      public_url: doc.storage_path ?
        `${supabaseUrl}/storage/v1/object/public/markdown-files/${doc.storage_path}` : null
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

async function handlePostRequest(request: Request) {
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

    // Verify API key with bcrypt (Supabase handles everything)
    const { data: authResult, error: keyError } = await serviceClient
      .rpc('verify_api_key_bcrypt', {
        p_api_key: apiKey
      })

    if (keyError || !authResult?.valid) {
      return NextResponse.json(
        { error: authResult?.error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // Get and validate search parameters from body
    const body = await request.json()

    // Validate and sanitize input parameters
    const validatedParams = {
      company_name: body.company_name ?
        UnifiedInputValidator.validateSearchQuery(body.company_name) : null,
      company_id: body.company_id ?
        UnifiedInputValidator.validateCompanyId(body.company_id) : null,
      fiscal_year: body.fiscal_year ?
        UnifiedInputValidator.validateFiscalYear(body.fiscal_year) : null,
      file_type: body.file_type ?
        UnifiedInputValidator.validateString(body.file_type, { maxLength: 50 }) : null
    }

    // Build query
    let query = serviceClient
      .from('markdown_files_metadata')
      .select('*')

    if (validatedParams.company_name) {
      query = query.ilike('company_name', `%${validatedParams.company_name}%`)
    }

    if (validatedParams.company_id) {
      query = query.eq('company_id', validatedParams.company_id)
    }

    if (validatedParams.fiscal_year) {
      query = query.eq('fiscal_year', validatedParams.fiscal_year)
    }

    if (validatedParams.file_type) {
      query = query.eq('file_type', validatedParams.file_type)
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
    // 環境変数から取得、設定されていない場合はエラー
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    const documentsWithUrls = documents?.map(doc => ({
      ...doc,
      public_url: doc.storage_path ?
        `${supabaseUrl}/storage/v1/object/public/markdown-files/${doc.storage_path}` : null
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

// Export with security middleware
export const GET = withSecurity(handleGetRequest)
export const POST = withSecurity(handlePostRequest)