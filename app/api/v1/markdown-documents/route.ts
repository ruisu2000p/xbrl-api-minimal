import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const query = searchParams.get('query') || searchParams.get('search');
    const companyId = searchParams.get('company_id');
    const fiscalYear = searchParams.get('fiscal_year');
    const fileName = searchParams.get('file_name');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeContent = searchParams.get('include_content') === 'true';

    // クエリ構築
    let queryBuilder = supabase
      .from('markdown_files_metadata')
      .select('*');

    // 検索条件の追加
    if (query) {
      // 日本語検索に対応（company_nameまたはfile_nameで検索）
      queryBuilder = queryBuilder.or(`company_name.ilike.%${query}%,file_name.ilike.%${query}%`);
    }

    if (companyId) {
      queryBuilder = queryBuilder.eq('company_id', companyId);
    }

    if (fiscalYear) {
      queryBuilder = queryBuilder.eq('fiscal_year', fiscalYear);
    }

    if (fileName) {
      queryBuilder = queryBuilder.ilike('file_name', `%${fileName}%`);
    }

    // ページネーション
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('company_id', { ascending: true })
      .order('fiscal_year', { ascending: false })
      .order('file_order', { ascending: true });

    // メタデータ取得
    const { data: metadata, error: metadataError, count } = await queryBuilder;

    if (metadataError) {
      console.error('Metadata query error:', metadataError);
      return NextResponse.json(
        { error: 'Failed to fetch metadata', details: metadataError.message },
        { status: 500 }
      );
    }

    if (!metadata || metadata.length === 0) {
      return NextResponse.json({
        message: 'No documents found',
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // コンテンツを含める場合、Storageから取得
    let results = metadata;
    if (includeContent) {
      results = await Promise.all(
        metadata.map(async (doc) => {
          try {
            // Storage pathからファイル取得
            if (doc.storage_path) {
              // storage_pathから"markdown-files/"プレフィックスを削除
              const cleanPath = doc.storage_path.replace(/^markdown-files\//, '');
              
              const { data: fileData, error: fileError } = await supabase.storage
                .from('markdown-files')
                .download(cleanPath);

              if (fileError) {
                console.error(`Failed to fetch file ${doc.storage_path}:`, fileError);
                return {
                  ...doc,
                  content: null,
                  content_error: fileError.message
                };
              }

              // ファイル内容を文字列に変換
              const content = await fileData.text();
              return {
                ...doc,
                content: content.substring(0, 50000) // 大きすぎる場合は最初の50KB
              };
            }
          } catch (error) {
            console.error(`Error processing file ${doc.storage_path}:`, error);
            return {
              ...doc,
              content: null,
              content_error: 'Failed to process file'
            };
          }
          return doc;
        })
      );
    }

    // カウントクエリ（全体件数取得）
    const { count: totalCount } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true })
      .or(query ? `company_name.ilike.%${query}%,file_name.ilike.%${query}%` : 'id.not.is.null')
      .eq(companyId ? 'company_id' : 'id', companyId || 'id')
      .eq(fiscalYear ? 'fiscal_year' : 'id', fiscalYear || 'id');

    // レスポンス作成
    return NextResponse.json({
      message: 'Documents retrieved successfully',
      data: results,
      pagination: {
        total: totalCount || count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount || count || 0)
      },
      query_params: {
        query,
        company_id: companyId,
        fiscal_year: fiscalYear,
        file_name: fileName,
        include_content: includeContent
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 特定ドキュメントの詳細取得
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, file_names, fiscal_year } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    // メタデータ取得
    let query = supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', company_id);

    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    if (file_names && Array.isArray(file_names)) {
      query = query.in('file_name', file_names);
    }

    const { data: metadata, error: metadataError } = await query;

    if (metadataError) {
      console.error('Metadata query error:', metadataError);
      return NextResponse.json(
        { error: 'Failed to fetch metadata', details: metadataError.message },
        { status: 500 }
      );
    }

    if (!metadata || metadata.length === 0) {
      return NextResponse.json({
        message: 'No documents found for the specified company',
        data: []
      });
    }

    // 各ファイルのコンテンツを取得
    const documentsWithContent = await Promise.all(
      metadata.map(async (doc) => {
        try {
          if (!doc.storage_path) {
            return {
              ...doc,
              content: null,
              content_error: 'No storage path'
            };
          }

          // storage_pathから"markdown-files/"プレフィックスを削除
          const cleanPath = doc.storage_path.replace(/^markdown-files\//, '');
          
          // Storageからファイル取得
          const { data: fileData, error: fileError } = await supabase.storage
            .from('markdown-files')
            .download(cleanPath);

          if (fileError) {
            console.error(`Failed to fetch file ${doc.storage_path}:`, fileError);
            return {
              ...doc,
              content: null,
              content_error: fileError.message
            };
          }

          // ファイル内容を文字列に変換
          const content = await fileData.text();
          
          return {
            ...doc,
            content,
            content_length: content.length
          };
        } catch (error) {
          console.error(`Error processing file ${doc.storage_path}:`, error);
          return {
            ...doc,
            content: null,
            content_error: 'Failed to process file'
          };
        }
      })
    );

    // 企業情報も取得
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    return NextResponse.json({
      message: 'Documents retrieved successfully',
      company: companyData,
      documents: documentsWithContent,
      summary: {
        total_documents: documentsWithContent.length,
        successful_downloads: documentsWithContent.filter(d => d.content).length,
        failed_downloads: documentsWithContent.filter(d => !d.content).length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}