// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/documents/[company_id]/[document_id] - 特定ドキュメントの詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string; document_id: string } }
) {
  try {
    const { company_id, document_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const include_content = searchParams.get('include_content') !== 'false'; // デフォルトでコンテンツを含める
    const max_content_length = parseInt(searchParams.get('max_content_length') || '10000');

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // ドキュメントメタデータを取得
    const { data: document, error } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', company_id)
      .eq('id', document_id)
      .single();

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

    if (!document) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Document not found: company_id=${company_id}, document_id=${document_id}`,
          status: 404
        },
        { status: 404 }
      );
    }

    let documentWithContent = { ...document };

    // Storage からコンテンツを取得
    if (include_content) {
      try {
        const { data: fileData, error: storageError } = await supabase.storage
          .from('markdown-files')
          .download(document.storage_path);
        
        if (storageError) {
          console.warn(`Storage error for ${document.storage_path}:`, storageError);
          documentWithContent.content = null;
          documentWithContent.content_error = storageError.message;
        } else if (fileData) {
          const fullContent = await fileData.text();
          
          // コンテンツの長さを制限
          if (fullContent.length > max_content_length) {
            documentWithContent.content = fullContent.substring(0, max_content_length);
            documentWithContent.content_truncated = true;
            documentWithContent.full_content_length = fullContent.length;
          } else {
            documentWithContent.content = fullContent;
            documentWithContent.content_truncated = false;
            documentWithContent.full_content_length = fullContent.length;
          }

          // コンテンツの基本分析
          const lines = fullContent.split('\n');
          const nonEmptyLines = lines.filter(line => line.trim().length > 0);
          
          documentWithContent.content_analysis = {
            total_characters: fullContent.length,
            total_lines: lines.length,
            non_empty_lines: nonEmptyLines.length,
            estimated_reading_time_minutes: Math.ceil(fullContent.length / 1000) // 1000文字/分で計算
          };

          // セクション見出しを抽出（# で始まる行）
          const headings = lines
            .filter(line => line.trim().startsWith('#'))
            .slice(0, 20) // 最初の20個の見出しのみ
            .map((line, index) => ({
              level: (line.match(/^#+/) || [''])[0].length,
              text: line.replace(/^#+\s*/, ''),
              line_number: lines.indexOf(line) + 1
            }));
          
          documentWithContent.headings = headings;
        }
      } catch (storageError) {
        console.error(`Failed to fetch content for ${document.storage_path}:`, storageError);
        documentWithContent.content = null;
        documentWithContent.content_error = 'Failed to fetch content from storage';
      }
    }

    // 同じ企業の関連ドキュメントを取得
    const { data: relatedDocs } = await supabase
      .from('markdown_files_metadata')
      .select('id, file_name, fiscal_year, file_size')
      .eq('company_id', company_id)
      .eq('fiscal_year', document.fiscal_year)
      .neq('id', document_id)
      .order('file_name', { ascending: true })
      .limit(10);

    // レスポンス作成
    return NextResponse.json({
      success: true,
      document: documentWithContent,
      related_documents: relatedDocs || [],
      metadata: {
        company_id,
        document_id,
        include_content,
        max_content_length: include_content ? max_content_length : null
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