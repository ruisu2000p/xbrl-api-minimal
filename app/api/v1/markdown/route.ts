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

// APIキーの検証
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith('xbrl_');
}

// GET: Markdownファイル検索とメタデータ取得
export async function GET(request: NextRequest) {
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
    const companyId = searchParams.get('company_id');
    const companyName = searchParams.get('company_name');
    const fiscalYear = searchParams.get('fiscal_year');
    const documentType = searchParams.get('document_type'); // PublicDoc, AuditDoc
    const sectionType = searchParams.get('section_type'); // header, company_overview, etc.
    const search = searchParams.get('search'); // フルテキスト検索
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // クエリ構築
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

    // フィルタリング
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`);
    }
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }
    
    if (documentType) {
      query = query.eq('document_type', documentType);
    }
    
    if (sectionType) {
      query = query.eq('section_type', sectionType);
    }
    
    // フルテキスト検索
    if (search) {
      query = query.textSearch('content_preview', search);
    }

    // 並び順とリミット
    query = query
      .order('company_id')
      .order('fiscal_year', { ascending: false })
      .order('file_order')
      .range(offset, offset + limit - 1);

    // データ取得
    const { data: files, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      );
    }

    // レスポンス
    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0,
      filters: {
        company_id: companyId,
        company_name: companyName,
        fiscal_year: fiscalYear,
        document_type: documentType,
        section_type: sectionType,
        search: search,
        limit: limit,
        offset: offset
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: MarkdownファイルのフルコンテンツをStorageから取得
export async function POST(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { file_path, storage_path } = body;

    if (!file_path && !storage_path) {
      return NextResponse.json(
        { success: false, error: 'file_path or storage_path is required' },
        { status: 400 }
      );
    }

    // メタデータをデータベースから取得
    const { data: metadata, error: metaError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq(file_path ? 'file_path' : 'storage_path', file_path || storage_path)
      .single();

    if (metaError || !metadata) {
      return NextResponse.json(
        { success: false, error: 'File metadata not found' },
        { status: 404 }
      );
    }

    // Storageからファイル内容を取得
    const storagePath = metadata.file_path;
    const { data: fileData, error: storageError } = await supabase.storage
      .from('markdown-files')
      .download(storagePath);

    if (storageError || !fileData) {
      console.error('Storage error:', storageError);
      return NextResponse.json(
        { success: false, error: 'File not found in storage' },
        { status: 404 }
      );
    }

    const content = await fileData.text();

    // アクセス数を更新
    await supabase
      .from('markdown_files_metadata')
      .update({ 
        access_count: (metadata.access_count || 0) + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('id', metadata.id);

    return NextResponse.json({
      success: true,
      metadata: {
        id: metadata.id,
        company_id: metadata.company_id,
        company_name: metadata.company_name,
        file_name: metadata.file_name,
        fiscal_year: metadata.fiscal_year,
        document_type: metadata.document_type,
        section_type: metadata.section_type,
        file_size: metadata.file_size,
        has_tables: metadata.has_tables,
        has_images: metadata.has_images
      },
      content: content,
      stats: {
        access_count: (metadata.access_count || 0) + 1,
        content_length: content.length,
        preview_length: metadata.content_preview?.length || 0
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}