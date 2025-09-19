import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { SecureInputValidator, ValidationError } from '@/lib/validators/secure-input-validator'
import { PathSecurity, SecurityError } from '@/lib/security/path-security'
import { SQLInjectionShield } from '@/lib/security/sql-injection-shield'
import { z } from 'zod'

// このルートは動的である必要があります（request.headersを使用）
export const dynamic = 'force-dynamic'

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
    const searchParams = request.nextUrl.searchParams
    let validatedParams: {
      companyId: string | null
      fiscalYear: string | null
      fileType: string | null
      limit: number
    }

    try {
      validatedParams = {
        companyId: searchParams.get('company_id') ?
          SecureInputValidator.sanitizeTextInput(searchParams.get('company_id'), 20) : null,
        fiscalYear: SecureInputValidator.validateFiscalYear(searchParams.get('fiscal_year')),
        fileType: SecureInputValidator.validateDocumentType(searchParams.get('file_type')),
        limit: SecureInputValidator.validateNumericInput(
          searchParams.get('limit'),
          1,
          100,
          20
        )
      }

      // Validate company ID format if provided
      if (validatedParams.companyId && !SecureInputValidator.validateCompanyId(validatedParams.companyId)) {
        throw new ValidationError('Invalid company ID format')
      }

      // SQL injection check for company ID
      if (validatedParams.companyId) {
        const injectionCheck = SQLInjectionShield.validateInput(validatedParams.companyId, 'filter')
        if (!injectionCheck.valid) {
          throw new ValidationError(`Invalid company ID: ${injectionCheck.reason}`)
        }
      }
    } catch (error) {
      console.warn('Input validation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: Object.fromEntries(searchParams.entries())
      })

      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          message: error instanceof ValidationError ? error.message : 'Validation failed'
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