// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// APIキーの検証
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('xbrl_');
}

// GET: 企業・ファイル統合検索
export async function GET(request: NextRequest) {
  // Create Supabase client inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q'); // 統合検索キーワード
    const type = searchParams.get('type') || 'all'; // 'companies', 'files', 'all'
    const fiscalYear = searchParams.get('fiscal_year');
    const documentType = searchParams.get('document_type');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const results: any = {
      query,
      companies: [],
      files: [],
      summary: {
        total_companies: 0,
        total_files: 0,
        fiscal_years: [],
        document_types: []
      }
    };

    // 企業検索
    if (type === 'companies' || type === 'all') {
      let companyQuery = supabase
        .from('companies')
        .select('id, name, ticker_code, sector, market')
        .or(`name.ilike.%${query}%,id.ilike.%${query}%,ticker_code.ilike.%${query}%`)
        .limit(type === 'companies' ? limit : 10);

      const { data: companies, error: companyError } = await companyQuery;
      
      if (companyError) {
        console.error('Company search error:', companyError);
      } else {
        results.companies = companies || [];
        results.summary.total_companies = companies?.length || 0;
      }
    }

    // ファイル検索（メタデータテーブルから）
    if (type === 'files' || type === 'all') {
      let fileQuery = supabase
        .from('markdown_files_metadata')
        .select(`
          id,
          company_id,
          company_name,
          file_name,
          fiscal_year,
          document_type,
          section_type,
          file_size,
          content_preview,
          has_tables,
          has_images,
          storage_path
        `)
        .or(`company_name.ilike.%${query}%,company_id.ilike.%${query}%,content_preview.ilike.%${query}%`)
        .limit(type === 'files' ? limit : 15);

      // 追加フィルター
      if (fiscalYear) {
        fileQuery = fileQuery.eq('fiscal_year', parseInt(fiscalYear));
      }
      
      if (documentType) {
        fileQuery = fileQuery.eq('document_type', documentType);
      }

      fileQuery = fileQuery
        .order('fiscal_year', { ascending: false })
        .order('access_count', { ascending: false });

      const { data: files, error: fileError } = await fileQuery;
      
      if (fileError) {
        console.error('File search error:', fileError);
      } else {
        results.files = files || [];
        results.summary.total_files = files?.length || 0;

        // 年度とドキュメントタイプの統計
        if (files && files.length > 0) {
          const years = [...new Set(files.map(f => f.fiscal_year).filter(y => y))];
          const docTypes = [...new Set(files.map(f => f.document_type).filter(t => t))];
          
          results.summary.fiscal_years = years.sort((a, b) => b - a);
          results.summary.document_types = docTypes;
        }
      }
    }

    // 関連企業の提案（企業が見つかった場合）
    if (results.companies.length > 0) {
      const companyIds = results.companies.map((c: any) => c.id);
      
      const { data: relatedFiles } = await supabase
        .from('markdown_files_summary')
        .select('company_id, company_name, fiscal_year, document_type, file_count')
        .in('company_id', companyIds)
        .order('file_count', { ascending: false });

      results.related_data = relatedFiles || [];
    }

    return NextResponse.json({
      success: true,
      ...results
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 詳細検索・フィルタリング
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      company_ids = [],
      company_names = [],
      fiscal_years = [],
      document_types = [],
      section_types = [],
      content_search = '',
      has_tables = null,
      has_images = null,
      min_file_size = null,
      max_file_size = null,
      sort_by = 'fiscal_year',
      sort_order = 'desc',
      limit = 50,
      offset = 0
    } = body;

    // 詳細クエリ構築
    let query = supabase
      .from('markdown_files_metadata')
      .select(`
        id,
        company_id,
        company_name,
        file_name,
        file_path,
        storage_path,
        fiscal_year,
        document_type,
        section_type,
        file_order,
        file_size,
        content_preview,
        has_tables,
        has_images,
        indexed_at,
        access_count
      `);

    // 複数条件フィルタリング
    if (company_ids.length > 0) {
      query = query.in('company_id', company_ids);
    }
    
    if (company_names.length > 0) {
      const nameConditions = company_names.map((name: string) => `company_name.ilike.%${name}%`);
      query = query.or(nameConditions.join(','));
    }
    
    if (fiscal_years.length > 0) {
      query = query.in('fiscal_year', fiscal_years);
    }
    
    if (document_types.length > 0) {
      query = query.in('document_type', document_types);
    }
    
    if (section_types.length > 0) {
      query = query.in('section_type', section_types);
    }
    
    if (content_search) {
      query = query.textSearch('content_preview', content_search);
    }
    
    if (has_tables !== null) {
      query = query.eq('has_tables', has_tables);
    }
    
    if (has_images !== null) {
      query = query.eq('has_images', has_images);
    }
    
    if (min_file_size !== null) {
      query = query.gte('file_size', min_file_size);
    }
    
    if (max_file_size !== null) {
      query = query.lte('file_size', max_file_size);
    }

    // ソートとページネーション
    const validSortFields = ['fiscal_year', 'file_size', 'access_count', 'indexed_at', 'company_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'fiscal_year';
    const sortAscending = sort_order === 'asc';

    query = query
      .order(sortField, { ascending: sortAscending })
      .range(offset, offset + limit - 1);

    const { data: files, error } = await query;

    if (error) {
      console.error('Advanced search error:', error);
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0,
      filters: {
        company_ids,
        company_names,
        fiscal_years,
        document_types,
        section_types,
        content_search,
        has_tables,
        has_images,
        file_size_range: [min_file_size, max_file_size],
        sort_by,
        sort_order,
        limit,
        offset
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}