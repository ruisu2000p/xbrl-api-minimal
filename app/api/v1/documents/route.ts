// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数（wpwqxhyiglbtlaimrjrxプロジェクトを使用）
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/documents - 財務ドキュメント一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const company_id = searchParams.get('company_id');
    const company_name = searchParams.get('company_name');
    const ticker_code = searchParams.get('ticker_code');
    const fiscal_year = searchParams.get('fiscal_year');
    const file_type = searchParams.get('file_type') || 'markdown';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '20');

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // クエリ構築
    let query = supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact' });

    // 検索条件追加
    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (company_name) {
      query = query.ilike('company_name', `%${company_name}%`);
    }

    if (ticker_code) {
      query = query.eq('ticker_code', ticker_code);
    }

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
      .order('company_name', { ascending: true })
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

    // レスポンス作成
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      },
      filters: {
        company_id,
        company_name,
        ticker_code,
        fiscal_year,
        file_type
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