// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStorageOptimizer } from '@/lib/utils/storage-optimizer';
import { getCache, generateFinancialCacheKey } from '@/lib/utils/cache-system';

// Supabase環境変数
const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// GET /api/v1/documents-optimized/[company_id]/[document_id] - 最適化されたドキュメント詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { company_id: string; document_id: string } }
) {
  const startTime = Date.now();
  
  try {
    const { company_id, document_id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // パラメータ取得
    const include_content = searchParams.get('include_content') !== 'false';
    const max_content_length = parseInt(searchParams.get('max_content_length') || '10000');
    const use_cache = searchParams.get('use_cache') !== 'false';
    const cache_ttl = parseInt(searchParams.get('cache_ttl') || '3600'); // 1時間

    // キャッシュとストレージ最適化器を初期化
    const cache = getCache();
    const storageOptimizer = getStorageOptimizer();

    // キャッシュキーを生成
    const cacheKey = generateFinancialCacheKey(
      'document',
      company_id,
      document_id,
      include_content.toString(),
      max_content_length.toString()
    );

    // キャッシュから取得を試行
    if (use_cache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        return NextResponse.json({
          ...cachedResult,
          performance: {
            response_time_ms: Date.now() - startTime,
            cache_hit: true,
            data_source: 'cache'
          }
        });
      }
    }

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // ドキュメントメタデータを取得
    const metadataStartTime = Date.now();
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

    const metadataTime = Date.now() - metadataStartTime;

    let documentWithContent = { ...document };
    let contentTime = 0;
    let contentSource = 'none';

    // Storage からコンテンツを取得（最適化版）
    if (include_content) {
      const contentStartTime = Date.now();
      
      try {
        if (max_content_length < 2000) {
          // 短いコンテンツの場合はプレビュー機能を使用
          const previewResult = await storageOptimizer.getFilePreview(
            document.storage_path,
            max_content_length
          );
          
          if (previewResult) {
            documentWithContent.content = previewResult.preview;
            documentWithContent.content_truncated = previewResult.isTruncated;
            documentWithContent.full_content_length = previewResult.totalSize;
            contentSource = 'preview_optimized';
          }
        } else {
          // 通常のコンテンツ取得（キャッシュ付き）
          const content = await storageOptimizer.getFileContent(
            document.storage_path,
            { 
              maxLength: max_content_length,
              useCache: true,
              ttl: cache_ttl * 1000 // ミリ秒に変換
            }
          );
          
          if (content) {
            documentWithContent.content = content;
            documentWithContent.content_truncated = content.length >= max_content_length;
            documentWithContent.full_content_length = content.length;
            contentSource = 'storage_optimized';
          }
        }

        // コンテンツの基本分析（キャッシュされたコンテンツで実行）
        if (documentWithContent.content) {
          const lines = documentWithContent.content.split('\n');
          const nonEmptyLines = lines.filter((line: string) => line.trim().length > 0);
          
          documentWithContent.content_analysis = {
            total_characters: documentWithContent.content.length,
            total_lines: lines.length,
            non_empty_lines: nonEmptyLines.length,
            estimated_reading_time_minutes: Math.ceil(documentWithContent.content.length / 1000)
          };

          // セクション見出しを抽出（最適化版）
          const headings = lines
            .filter((line: string) => line.trim().startsWith('#'))
            .slice(0, 20) // 最初の20個の見出しのみ
            .map((line: string, index: number) => ({
              level: (line.match(/^#+/) || [''])[0].length,
              text: line.replace(/^#+\s*/, ''),
              line_number: lines.indexOf(line) + 1
            }));
          
          documentWithContent.headings = headings;
        }
        
        contentTime = Date.now() - contentStartTime;
        
      } catch (storageError) {
        console.error(`Failed to fetch content for ${document.storage_path}:`, storageError);
        documentWithContent.content = null;
        documentWithContent.content_error = 'Failed to fetch content from storage';
        contentSource = 'error';
      }
    }

    // 同じ企業の関連ドキュメントを取得（キャッシュ付き）
    const relatedCacheKey = generateFinancialCacheKey('document', company_id, document.fiscal_year);
    let relatedDocs = null;
    
    if (use_cache) {
      relatedDocs = await cache.get(relatedCacheKey);
    }
    
    if (!relatedDocs) {
      const { data: relatedData } = await supabase
        .from('markdown_files_metadata')
        .select('id, file_name, fiscal_year, file_size')
        .eq('company_id', company_id)
        .eq('fiscal_year', document.fiscal_year)
        .neq('id', document_id)
        .order('file_name', { ascending: true })
        .limit(10);
      
      relatedDocs = relatedData || [];
      
      if (use_cache) {
        await cache.set(relatedCacheKey, relatedDocs, cache_ttl);
      }
    }

    // パフォーマンス統計
    const totalTime = Date.now() - startTime;
    const performance = {
      response_time_ms: totalTime,
      metadata_time_ms: metadataTime,
      content_time_ms: contentTime,
      cache_hit: false,
      data_source: contentSource,
      content_source: contentSource,
      optimizations_used: [
        include_content && max_content_length < 2000 ? 'preview_mode' : null,
        'storage_optimizer',
        use_cache ? 'cache_system' : null
      ].filter(Boolean)
    };

    // レスポンス作成
    const response = {
      success: true,
      document: documentWithContent,
      related_documents: relatedDocs,
      metadata: {
        company_id,
        document_id,
        include_content,
        max_content_length: include_content ? max_content_length : null,
        cache_enabled: use_cache,
        cache_ttl: cache_ttl
      },
      performance,
      status: 200
    };

    // 結果をキャッシュに保存
    if (use_cache) {
      await cache.set(cacheKey, response, cache_ttl);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Optimized API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        performance: {
          response_time_ms: Date.now() - startTime,
          cache_hit: false,
          data_source: 'error'
        },
        status: 500
      },
      { status: 500 }
    );
  }
}