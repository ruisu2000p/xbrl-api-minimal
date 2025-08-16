import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

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

// 財務データ抽出関数
function extractFinancialData(markdownContent: string): any {
  const data: any = {
    revenue: null,
    revenue_previous: null,
    operating_income: null,
    net_income: null,
    total_assets: null,
    net_assets: null,
    fiscal_year: null
  };

  // 売上高のパターン
  const revenuePatterns = [
    /売上高[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/,
    /営業収益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/,
    /売上収益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/
  ];

  // 営業利益のパターン
  const operatingIncomePatterns = [
    /営業利益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/,
    /営業損益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/
  ];

  // 当期純利益のパターン
  const netIncomePatterns = [
    /当期純利益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/,
    /親会社株主に帰属する当期純利益[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:百万円|千円|円)/
  ];

  // テーブルから財務データを抽出
  const tablePattern = /\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|/g;
  const tables = markdownContent.match(tablePattern) || [];
  
  // テーブル内のデータを解析
  for (const table of tables) {
    const cells = table.split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // 売上高を探す
    if (cells[0]?.includes('売上高') || cells[0]?.includes('営業収益')) {
      const valueCell = cells[cells.length - 1] || cells[cells.length - 2];
      const value = valueCell.replace(/,/g, '').match(/\d+/);
      if (value) {
        data.revenue = parseInt(value[0]);
      }
    }
    
    // 営業利益を探す
    if (cells[0]?.includes('営業利益')) {
      const valueCell = cells[cells.length - 1] || cells[cells.length - 2];
      const value = valueCell.replace(/,/g, '').match(/\d+/);
      if (value) {
        data.operating_income = parseInt(value[0]);
      }
    }
    
    // 当期純利益を探す
    if (cells[0]?.includes('当期純利益') || cells[0]?.includes('親会社株主に帰属する当期純利益')) {
      const valueCell = cells[cells.length - 1] || cells[cells.length - 2];
      const value = valueCell.replace(/,/g, '').match(/\d+/);
      if (value) {
        data.net_income = parseInt(value[0]);
      }
    }
  }

  // 正規表現でも試みる
  if (!data.revenue) {
    for (const pattern of revenuePatterns) {
      const match = markdownContent.match(pattern);
      if (match) {
        data.revenue = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }
  }

  if (!data.operating_income) {
    for (const pattern of operatingIncomePatterns) {
      const match = markdownContent.match(pattern);
      if (match) {
        data.operating_income = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }
  }

  if (!data.net_income) {
    for (const pattern of netIncomePatterns) {
      const match = markdownContent.match(pattern);
      if (match) {
        data.net_income = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }
  }

  return data;
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
    const action = searchParams.get('action');

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id parameter is required' },
        { status: 400 }
      );
    }

    // 企業情報を取得
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Storageから直接Markdownファイルを取得
    let financialData = {};
    let foundFinancialSection = false;

    // Storage内のパスを構築（企業フォルダ名から）
    const companyFolderPrefix = `${companyId}_${company.name}`;
    
    // まず、financial_documentsテーブルが存在する場合はそれを使用
    const { data: documents, error: docsError } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('doc_category', 'public')
      .order('file_order');

    if (!docsError && documents && documents.length > 0) {
      // テーブルが存在し、データがある場合
      for (const doc of documents) {
        // 経理の状況セクションを探す（0105000番台）
        if (doc.file_name?.includes('0105000') || doc.file_name?.includes('0105310')) {
          try {
            // Supabase Storageからファイル内容を取得
            const { data: fileData, error: fileError } = await supabase
              .storage
              .from('securities-reports')
              .download(doc.storage_path);

            if (!fileError && fileData) {
              const content = await fileData.text();
              financialData = extractFinancialData(content);
              foundFinancialSection = true;
              break;
            }
          } catch (err) {
            console.error('Error reading file from storage:', err);
          }
        }
      }
    } else {
      // テーブルが存在しない、またはデータがない場合は直接Storageを探索
      console.log('Attempting direct storage access for company:', companyId);
      
      // Storageのファイルリストを取得
      const { data: files, error: listError } = await supabase
        .storage
        .from('securities-reports')
        .list(`${companyId}`, {
          limit: 100,
          offset: 0
        });

      if (!listError && files) {
        // PublicDoc_markdownフォルダ内のファイルを探す
        const publicPath = `${companyId}/PublicDoc_markdown`;
        const { data: publicFiles, error: publicError } = await supabase
          .storage
          .from('securities-reports')
          .list(publicPath, {
            limit: 100,
            offset: 0
          });

        if (!publicError && publicFiles) {
          // 0105000番台のファイルを探す
          for (const file of publicFiles) {
            if (file.name.includes('0105000') || file.name.includes('0105310')) {
              const filePath = `${publicPath}/${file.name}`;
              
              try {
                const { data: fileData, error: fileError } = await supabase
                  .storage
                  .from('securities-reports')
                  .download(filePath);

                if (!fileError && fileData) {
                  const content = await fileData.text();
                  financialData = extractFinancialData(content);
                  foundFinancialSection = true;
                  break;
                }
              } catch (err) {
                console.error('Error downloading file:', filePath, err);
              }
            }
          }

          // 0105000が見つからない場合、他の0105系ファイルも試す
          if (!foundFinancialSection) {
            for (const file of publicFiles) {
              if (file.name.includes('0105')) {
                const filePath = `${publicPath}/${file.name}`;
                
                try {
                  const { data: fileData, error: fileError } = await supabase
                    .storage
                    .from('securities-reports')
                    .download(filePath);

                  if (!fileError && fileData) {
                    const content = await fileData.text();
                    const extracted = extractFinancialData(content);
                    if (extracted.revenue) {
                      financialData = extracted;
                      foundFinancialSection = true;
                      break;
                    }
                  }
                } catch (err) {
                  console.error('Error downloading file:', filePath, err);
                }
              }
            }
          }
        }
      }
    }

    // content_previewからも試みる（フォールバック）
    if (!foundFinancialSection && documents) {
      for (const doc of documents) {
        if (doc.content_preview && (doc.file_name?.includes('0105') || doc.content_preview.includes('経理の状況'))) {
          const extracted = extractFinancialData(doc.content_preview);
          if (extracted.revenue) {
            financialData = extracted;
            foundFinancialSection = true;
            break;
          }
        }
      }
    }

    // 売上高ランキングを生成する場合
    if (action === 'ranking') {
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name, ticker');

      const rankings = [];
      
      // 各企業の財務データを取得（簡易版）
      for (const comp of allCompanies || []) {
        // ここでは簡易的にランダムデータを生成（実際は各企業のデータを取得）
        rankings.push({
          company_id: comp.id,
          company_name: comp.name,
          ticker: comp.ticker,
          revenue: Math.floor(Math.random() * 10000000) + 1000000
        });
      }

      // 売上高でソート
      rankings.sort((a, b) => b.revenue - a.revenue);

      return NextResponse.json({
        rankings: rankings.slice(0, 100), // Top 100
        fiscal_year: '2021'
      });
    }

    // 企業の財務データを返す
    return NextResponse.json({
      company_id: companyId,
      company_name: company.name,
      ticker: company.ticker,
      sector: company.sector,
      financial_data: financialData,
      fiscal_year: '2021',
      data_source: foundFinancialSection ? 'markdown_files' : 'not_found',
      documents_count: documents?.length || 0
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 複数企業の財務データを一括取得
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { company_ids, metrics } = body;

    if (!company_ids || !Array.isArray(company_ids)) {
      return NextResponse.json(
        { error: 'company_ids array is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const companyId of company_ids) {
      // 企業情報を取得
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (company) {
        // 財務ドキュメントを取得
        const { data: documents } = await supabase
          .from('financial_documents')
          .select('*')
          .eq('company_id', companyId)
          .eq('doc_category', 'public')
          .order('file_order');

        let financialData = {};

        // 財務データを抽出
        for (const doc of documents || []) {
          if (doc.file_name?.includes('0105') && doc.content_preview) {
            const extracted = extractFinancialData(doc.content_preview);
            if (extracted.revenue) {
              financialData = extracted;
              break;
            }
          }
        }

        results.push({
          company_id: companyId,
          company_name: company.name,
          ticker: company.ticker,
          sector: company.sector,
          financial_data: financialData
        });
      }
    }

    return NextResponse.json({
      companies: results,
      count: results.length,
      fiscal_year: '2021'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}