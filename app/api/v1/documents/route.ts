// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Debug: Check if environment variables are loaded
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...');
console.log('SERVICE_KEY loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// APIキーの検証
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('xbrl_');
}

export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const fileType = searchParams.get('file_type');
    const docCategory = searchParams.get('doc_category') || 'PublicDoc';
    const fiscalYear = searchParams.get('fiscal_year');
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeContent = searchParams.get('include_content') === 'true';

    // クエリ構築
    let query = supabase
      .from('financial_documents')
      .select(includeContent ? '*' : 'id,company_id,file_name,file_order,document_type,fiscal_year,storage_path,content_preview,created_at,updated_at');

    // フィルタリング
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    if (fileType) {
      query = query.eq('document_type', fileType);
    }
    
    if (docCategory) {
      query = query.eq('document_type', docCategory);
    }
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }

    // 並び順とリミット
    query = query
      .order('file_order', { ascending: true })
      .limit(limit);

    // データ取得
    const { data: documents, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    // レスポンス
    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0,
      filters: {
        company_id: companyId,
        file_type: fileType,
        document_type: docCategory,
        fiscal_year: fiscalYear,
        include_content: includeContent
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: ドキュメント検索
export async function POST(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query: searchQuery, company_id, file_types, limit = 10 } = body;

    let query = supabase
      .from('financial_documents')
      .select('id,company_id,company_name,file_name,file_type,doc_category,storage_path,content_preview,metadata');

    // 全文検索
    if (searchQuery) {
      query = query.textSearch('content_preview', searchQuery);
    }

    // 企業フィルター
    if (company_id) {
      if (Array.isArray(company_id)) {
        query = query.in('company_id', company_id);
      } else {
        query = query.eq('company_id', company_id);
      }
    }

    // ファイルタイプフィルター
    if (file_types && Array.isArray(file_types)) {
      query = query.in('file_type', file_types);
    }

    // 並び順とリミット
    query = query
      .order('company_id')
      .order('file_order')
      .limit(limit);

    const { data: documents, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0,
      query: searchQuery
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}