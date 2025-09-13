// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/documents/[company_id] - 特定企業の財務ドキュメント取得
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string } }
) {
  try {
    const { company_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const fiscal_year = searchParams.get('fiscal_year');
    const file_type = searchParams.get('file_type') || 'markdown';
    const include_content = searchParams.get('include_content') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // クエリ構築
    let query = supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact' })
      .eq('company_id', company_id);

    // 検索条件追加
    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    if (file_type) {
      query = query.eq('file_type', file_type);
    }

    // ページネーション
    const offset = (page - 1) * per_page;
    query = query
      .range(offset, offset + per_page - 1)
      .order('fiscal_year', { ascending: false })
      .order('file_name', { ascending: true });

    // データ取得
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          status: 500
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No documents found for company_id: ${company_id}`,
          status: 404
        },
        { status: 404 }
      );
    }

    // Storage からコンテンツを取得（オプション）
    let documentsWithContent = data;
    
    if (include_content) {
      documentsWithContent = await Promise.all(
        data.map(async (doc) => {
          try {
            const { data: fileData } = await supabase.storage
              .from('markdown-files')
              .download(doc.storage_path);
            
            if (fileData) {
              const content = await fileData.text();
              return {
                ...doc,
                content: content.substring(0, 1000) + (content.length > 1000 ? '...' : '') // 最初の1000文字のみ
              };
            }
          } catch (storageError) {
            console.warn(`Failed to fetch content for ${doc.storage_path}:`, storageError);
          }
          
          return {
            ...doc,
            content: null
          };
        })
      );
    }

    // 企業情報も含める
    const companyInfo = data[0] ? {
      company_id: data[0].company_id,
      company_name: data[0].company_name,
      ticker_code: data[0].ticker_code,
      sector: data[0].sector
    } : null;

    // 年度別統計を作成
    const yearStats = data.reduce((acc: any, doc) => {
      const year = doc.fiscal_year;
      if (!acc[year]) {
        acc[year] = { fiscal_year: year, document_count: 0, documents: [] };
      }
      acc[year].document_count++;
      acc[year].documents.push({
        id: doc.id,
        file_name: doc.file_name,
        file_size: doc.file_size,
        storage_path: doc.storage_path
      });
      return acc;
    }, {});

    // レスポンス作成
    return NextResponse.json({
      success: true,
      company: companyInfo,
      data: documentsWithContent,
      statistics: {
        total_documents: count || 0,
        fiscal_years: Object.keys(yearStats).sort().reverse(),
        by_year: Object.values(yearStats)
      },
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      },
      filters: {
        company_id,
        fiscal_year,
        file_type,
        include_content
      },
      status: 200
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500
      },
      { status: 500 }
    );
  }
}