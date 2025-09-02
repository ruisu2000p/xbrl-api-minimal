/**
 * XBRL Financial Data MCP Server v0.5.0
 * BFF (Backend for Frontend) 統合版
 * 
 * このMCPサーバーは、XBRL BFF Edge Function経由で
 * 日本の上場企業の財務文書へのアクセスを提供します。
 * Service Keyを配布せずに安全にデータアクセスが可能です。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// BFF API設定
const BFF_URL = process.env.XBRL_API_URL || process.env.BFF_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-bff';
const API_KEY = process.env.XBRL_API_KEY || process.env.BFF_API_KEY || 'xbrl_test_key_123';

// BFFモード判定（URLがBFFエンドポイントを指している場合）
const IS_BFF_MODE = BFF_URL.includes('/functions/') || BFF_URL.includes('/xbrl-bff');

// BFF APIリクエストを送信する共通関数
async function makeBffRequest(endpoint, params = {}) {
  const url = new URL(`${BFF_URL}${endpoint}`);
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  const options = {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY,  // BFFはx-api-keyヘッダーを使用
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`BFF request failed: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('BFF Request Error:', error);
    throw error;
  }
}

// 従来のAPIリクエスト（フォールバック用）
async function makeApiRequest(endpoint, params = {}, method = 'GET', body = null) {
  // BFFモードの場合は専用関数を使用
  if (IS_BFF_MODE && method === 'GET') {
    // BFFエンドポイントマッピング
    if (endpoint === '/search-company') {
      return makeBffRequest('/search-company', params);
    }
    // その他のエンドポイントはBFF対応を追加可能
  }
  
  const url = new URL(`${BFF_URL}${endpoint}`);
  
  if (method === 'GET') {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
  }

  const options = {
    method,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// BFF経由で企業名検索
async function searchCompanyViaBFF(companyName) {
  try {
    const data = await makeBffRequest('/search-company', {
      q: companyName,
      limit: 20
    });
    
    // BFFは既にユニークな企業リストを返す
    return data.map(company => ({
      company_id: company.company_id,
      company_name: company.company_name,
      available_years: [] // BFFは年度情報を返さない
    }));
  } catch (error) {
    console.error('BFF search error:', error);
    return [];
  }
}

// Supabase直接アクセスで企業名検索（レガシー）
async function searchCompanyInMetadata(companyName) {
  // BFFモードの場合はBFF経由で検索
  if (IS_BFF_MODE) {
    return searchCompanyViaBFF(companyName);
  }
  
  // レガシーモード（直接Supabaseアクセス）
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_KEY not configured');
    return searchCompaniesByNameViaAPI(companyName);
  }

  try {
    const searchUrl = `${SUPABASE_URL}/rest/v1/markdown_files_metadata`;
    const params = new URLSearchParams({
      select: 'company_id,company_name,fiscal_year',
      company_name: `ilike.%${companyName}%`,  // 部分一致検索
      limit: '100'
    });

    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase search failed: ${response.status}`);
    }

    const data = await response.json();
    
    // 企業IDごとにグループ化
    const companies = new Map();
    data.forEach(row => {
      if (!companies.has(row.company_id)) {
        companies.set(row.company_id, {
          company_id: row.company_id,
          company_name: row.company_name,
          fiscal_years: new Set()
        });
      }
      if (row.fiscal_year) {
        companies.get(row.company_id).fiscal_years.add(row.fiscal_year);
      }
    });

    return Array.from(companies.values()).map(company => ({
      company_id: company.company_id,
      company_name: company.company_name,
      available_years: Array.from(company.fiscal_years).sort()
    }));
  } catch (error) {
    console.error('Supabase metadata search error:', error);
    // フォールバック
    return searchCompaniesByNameViaAPI(companyName);
  }
}

// BFF経由でMarkdownファイル一覧取得
async function listMdFilesViaBFF(companyId, fiscalYear = null) {
  try {
    const params = { company_id: companyId };
    if (fiscalYear) {
      params.fiscal_year = fiscalYear;
    }
    
    const data = await makeBffRequest('/list-md', params);
    return data.map(file => ({
      file_name: file.path.split('/').pop(),
      file_path: file.path,
      storage_path: file.path,
      size: file.size,
      last_modified: file.last_modified
    }));
  } catch (error) {
    console.error('BFF list files error:', error);
    return [];
  }
}

// Storage内のMarkdownファイルを列挙（レガシー）
async function listMdFilesByCompanyId(companyId, fiscalYear = null) {
  // BFFモードの場合はBFF経由で取得
  if (IS_BFF_MODE) {
    return listMdFilesViaBFF(companyId, fiscalYear);
  }
  
  // レガシーモード
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_KEY not configured');
    return [];
  }

  try {
    // まずmetadataテーブルから該当ファイル情報を取得
    const metadataUrl = `${SUPABASE_URL}/rest/v1/markdown_files_metadata`;
    const params = new URLSearchParams({
      select: 'file_path,file_name,fiscal_year,section_type,content_preview',
      company_id: `eq.${companyId}`,
      order: 'file_order.asc,file_name.asc'
    });

    if (fiscalYear) {
      params.append('fiscal_year', `eq.${fiscalYear}`);
    }

    const response = await fetch(`${metadataUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Metadata fetch failed: ${response.status}`);
    }

    const files = await response.json();
    
    // ファイルごとにStorage URLを生成
    return files.map(file => ({
      ...file,
      storage_path: `${companyId}/PublicDoc_markdown/${file.file_name}`,
      download_url: `${SUPABASE_URL}/storage/v1/object/markdown-files/${companyId}/PublicDoc_markdown/${file.file_name}`
    }));
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// BFF経由でファイルコンテンツ取得
async function getFileContentViaBFF(storagePath) {
  try {
    const data = await makeBffRequest('/get-md', {
      path: storagePath
    });
    return data.content;
  } catch (error) {
    console.error('BFF get content error:', error);
    return null;
  }
}

// ファイルコンテンツをStorageから取得（レガシー）
async function getFileContent(storagePath) {
  // BFFモードの場合はBFF経由で取得
  if (IS_BFF_MODE) {
    return getFileContentViaBFF(storagePath);
  }
  
  // レガシーモード
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!SUPABASE_SERVICE_KEY) {
    return null;
  }

  try {
    const url = `${SUPABASE_URL}/storage/v1/object/markdown-files/${storagePath}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`File download failed: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

// 既存API経由の検索（フォールバック用）
async function searchCompaniesByNameViaAPI(companyName) {
  try {
    console.error(`Fallback: Searching via API for: ${companyName}`);
    
    const data = await makeApiRequest('/markdown-documents', {
      query: companyName,
      limit: 20
    });
    
    if (data.data && data.data.length > 0) {
      const companies = new Map();
      data.data.forEach(doc => {
        if (doc.company_id && doc.company_name) {
          if (!companies.has(doc.company_id)) {
            companies.set(doc.company_id, {
              company_id: doc.company_id,
              company_name: doc.company_name,
              fiscal_years: new Set()
            });
          }
          if (doc.fiscal_year) {
            companies.get(doc.company_id).fiscal_years.add(doc.fiscal_year);
          }
        }
      });
      
      return Array.from(companies.values()).map(company => ({
        company_id: company.company_id,
        company_name: company.company_name,
        available_years: Array.from(company.fiscal_years).sort()
      }));
    }
    
    return [];
  } catch (error) {
    console.error('API search error:', error);
    return [];
  }
}

// メイン検索関数（自動的に最適な方法を選択）
async function searchCompaniesByName(companyName) {
  // BFFモードを優先
  if (IS_BFF_MODE) {
    return searchCompanyViaBFF(companyName);
  }
  // レガシーモード
  return searchCompanyInMetadata(companyName);
}

// MCPサーバーの作成
const server = new Server(
  {
    name: "xbrl-api-server",
    version: "0.5.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 利用可能なツールのリスト
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_companies_by_name",
        description: "企業名で企業を検索します。部分一致で検索可能です。",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "検索する企業名（例: 亀田製菓、トヨタ、ソニー）",
            },
          },
          required: ["company_name"],
        },
      },
      {
        name: "get_company_documents",
        description: "企業の財務文書を取得します。企業名または企業IDで指定可能。",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "企業名（例: 亀田製菓）",
            },
            company_id: {
              type: "string",
              description: "企業ID（例: S100TMYO）※company_nameがあれば不要",
            },
            fiscal_year: {
              type: "string",
              description: "会計年度（例: 2024, 2023）",
            },
            include_content: {
              type: "boolean",
              description: "文書の内容を含めるか（デフォルト: false）",
              default: false,
            },
          },
          oneOf: [
            { required: ["company_name"] },
            { required: ["company_id"] }
          ],
        },
      },
      {
        name: "analyze_company_financials",
        description: "企業の財務分析を行います。売上高、利益、ROE、ROAなどを自動計算。",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "企業名（例: 亀田製菓、トヨタ自動車）",
            },
            company_id: {
              type: "string",
              description: "企業ID（※company_nameがあれば不要）",
            },
            fiscal_year: {
              type: "string",
              description: "分析対象年度（例: 2024）",
            },
            compare_previous_year: {
              type: "boolean",
              description: "前年比較を行うか（デフォルト: true）",
              default: true,
            },
          },
          oneOf: [
            { required: ["company_name"] },
            { required: ["company_id"] }
          ],
        },
      },
      {
        name: "compare_companies",
        description: "複数企業の財務データを比較します。",
        inputSchema: {
          type: "object",
          properties: {
            company_names: {
              type: "array",
              items: {
                type: "string"
              },
              description: "比較する企業名のリスト（例: [\"亀田製菓\", \"カルビー\", \"湖池屋\"]）",
            },
            fiscal_year: {
              type: "string",
              description: "比較対象年度",
            },
            metrics: {
              type: "array",
              items: {
                type: "string",
                enum: ["売上高", "営業利益", "当期純利益", "ROE", "ROA", "営業利益率"]
              },
              description: "比較する指標（デフォルト: すべて）",
            },
          },
          required: ["company_names"],
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_companies_by_name": {
        if (!args.company_name) {
          return {
            content: [{
              type: "text",
              text: "企業名を指定してください。",
            }],
          };
        }

        const companies = await searchCompaniesByName(args.company_name);
        
        if (companies.length === 0) {
          return {
            content: [{
              type: "text",
              text: `「${args.company_name}」に該当する企業が見つかりませんでした。\n別の表記（株式会社の有無など）で再度検索してみてください。`,
            }],
          };
        }
        
        let resultText = `「${args.company_name}」の検索結果: ${companies.length}社見つかりました\n\n`;
        companies.forEach((company, index) => {
          resultText += `${index + 1}. ${company.company_name}\n`;
          resultText += `   企業ID: ${company.company_id}\n`;
          if (company.available_years && company.available_years.length > 0) {
            resultText += `   利用可能年度: ${company.available_years.join(', ')}\n`;
          }
          if (company.description) {
            resultText += `   説明: ${company.description}\n`;
          }
          resultText += '\n';
        });
        
        return {
          content: [{
            type: "text",
            text: resultText,
          }],
        };
      }

      case "get_company_documents": {
        let targetCompanyId = args.company_id;
        let targetCompanyName = args.company_name;
        
        // company_nameが指定されている場合、企業を検索
        if (args.company_name && !args.company_id) {
          const companies = await searchCompaniesByName(args.company_name);
          if (companies.length > 0) {
            targetCompanyId = companies[0].company_id;
            targetCompanyName = companies[0].company_name;
            
            if (companies.length > 1) {
              console.error(`Multiple companies found for "${args.company_name}", using first: ${targetCompanyName}`);
            }
          } else {
            return {
              content: [{
                type: "text",
                text: `「${args.company_name}」に該当する企業が見つかりませんでした。`,
              }],
            };
          }
        }
        
        // Supabase直接アクセスが可能な場合
        if (SUPABASE_SERVICE_KEY) {
          const files = await listMdFilesByCompanyId(targetCompanyId, args.fiscal_year);
          
          let resultText = `【${targetCompanyName || targetCompanyId}】の財務文書\n`;
          if (args.fiscal_year) {
            resultText += `年度: ${args.fiscal_year}\n`;
          }
          resultText += '\n';
          
          if (files.length > 0) {
            resultText += `📊 取得文書数: ${files.length}件\n\n`;
            
            if (args.include_content) {
              // 主要な文書の内容を取得
              const importantFiles = files.filter(f => 
                f.section_type === '事業の状況' ||
                f.section_type === '経理の状況' ||
                f.file_name.includes('0102010') ||
                f.file_name.includes('0104010')
              ).slice(0, 3);
              
              for (const [index, file] of importantFiles.entries()) {
                resultText += `--- 文書 ${index + 1} ---\n`;
                resultText += `📄 ${file.file_name}\n`;
                if (file.section_type) {
                  resultText += `セクション: ${file.section_type}\n`;
                }
                
                // コンテンツを取得
                const content = await getFileContent(file.storage_path);
                if (content) {
                  const maxLength = 800;
                  resultText += `内容（抜粋）:\n${content.substring(0, maxLength)}...\n\n`;
                } else if (file.content_preview) {
                  resultText += `内容（プレビュー）:\n${file.content_preview}\n\n`;
                }
              }
            } else {
              // メタデータのみ表示
              files.slice(0, 10).forEach(file => {
                resultText += `📄 ${file.file_name}\n`;
                if (file.section_type) {
                  resultText += `   セクション: ${file.section_type}\n`;
                }
              });
              if (files.length > 10) {
                resultText += `\n... 他${files.length - 10}件\n`;
              }
            }
          } else {
            resultText += "文書が見つかりませんでした。\n";
          }
          
          return {
            content: [{
              type: "text",
              text: resultText,
            }],
          };
        }
        
        // フォールバック: 既存のAPI経由
        if (args.include_content) {
          const data = await makeApiRequest('/markdown-documents', {}, 'POST', {
            company_id: targetCompanyId,
            fiscal_year: args.fiscal_year,
          });
          
          let resultText = `【${targetCompanyName || targetCompanyId}】の財務文書\n`;
          if (args.fiscal_year) {
            resultText += `年度: ${args.fiscal_year}\n`;
          }
          resultText += '\n';
          
          if (data.documents && data.documents.length > 0) {
            resultText += `📊 取得文書数: ${data.documents.length}件\n`;
            resultText += `✅ 成功: ${data.summary?.successful_downloads || 0}件\n`;
            resultText += `❌ 失敗: ${data.summary?.failed_downloads || 0}件\n\n`;
            
            const importantDocs = data.documents.filter(doc => 
              doc.file_name && (
                doc.file_name.includes('0102010') ||
                doc.file_name.includes('0103010') ||
                doc.file_name.includes('0104010')
              )
            );
            
            importantDocs.forEach((doc, index) => {
              resultText += `--- 文書 ${index + 1} ---\n`;
              resultText += `📄 ${doc.file_name}\n`;
              
              if (doc.content) {
                const content = doc.content;
                const maxLength = 800;
                resultText += `内容（抜粋）:\n${content.substring(0, maxLength)}...\n\n`;
              }
            });
          } else {
            resultText += "文書が見つかりませんでした。\n";
          }
          
          return {
            content: [{
              type: "text",
              text: resultText,
            }],
          };
        } else {
          const data = await makeApiRequest('/markdown-documents', {
            company_id: targetCompanyId,
            fiscal_year: args.fiscal_year,
            limit: 20,
          });
          
          let resultText = `【${targetCompanyName || targetCompanyId}】の文書一覧\n\n`;
          
          if (data.data && data.data.length > 0) {
            resultText += `📁 総文書数: ${data.pagination?.total || data.data.length}件\n\n`;
            
            const byYear = {};
            data.data.forEach(doc => {
              const year = doc.fiscal_year || 'unknown';
              if (!byYear[year]) byYear[year] = [];
              byYear[year].push(doc);
            });
            
            Object.entries(byYear).sort().reverse().forEach(([year, docs]) => {
              resultText += `【${year}年度】\n`;
              docs.slice(0, 5).forEach(doc => {
                resultText += `  📄 ${doc.file_name}\n`;
              });
              if (docs.length > 5) {
                resultText += `  ... 他${docs.length - 5}件\n`;
              }
              resultText += '\n';
            });
          } else {
            resultText += "文書が見つかりませんでした。\n";
          }
          
          return {
            content: [{
              type: "text",
              text: resultText,
            }],
          };
        }
      }

      case "analyze_company_financials": {
        let targetCompanyId = args.company_id;
        let targetCompanyName = args.company_name;
        
        // company_nameから企業IDを取得
        if (args.company_name && !args.company_id) {
          const companies = await searchCompaniesByName(args.company_name);
          if (companies.length > 0) {
            targetCompanyId = companies[0].company_id;
            targetCompanyName = companies[0].company_name;
          } else {
            return {
              content: [{
                type: "text",
                text: `「${args.company_name}」に該当する企業が見つかりませんでした。`,
              }],
            };
          }
        }
        
        const currentYear = args.fiscal_year || '2024';
        const previousYear = String(parseInt(currentYear) - 1);
        
        // データ取得
        const requests = [
          makeApiRequest('/markdown-documents', {}, 'POST', {
            company_id: targetCompanyId,
            fiscal_year: currentYear,
          })
        ];
        
        if (args.compare_previous_year !== false) {
          requests.push(
            makeApiRequest('/markdown-documents', {}, 'POST', {
              company_id: targetCompanyId,
              fiscal_year: previousYear,
            })
          );
        }
        
        const results = await Promise.all(requests);
        const [currentData, previousData] = results;
        
        let resultText = `📊【${targetCompanyName || targetCompanyId}】財務分析レポート\n`;
        resultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        resultText += `対象年度: ${currentYear}年度`;
        if (args.compare_previous_year !== false) {
          resultText += `（前年比較あり）`;
        }
        resultText += '\n\n';
        
        // 財務指標の抽出
        const extractMetrics = (data) => {
          const metrics = {};
          if (data.documents && data.documents.length > 0) {
            const businessDoc = data.documents.find(d => 
              d.file_name && d.file_name.includes('honbun') && d.content
            );
            
            if (businessDoc && businessDoc.content) {
              const content = businessDoc.content;
              
              // より柔軟なパターンマッチング
              const patterns = {
                売上高: /売上高[^\d]*?([\d,]+)[^\d]*?百万円/,
                営業利益: /営業利益[^\d]*?([\d,]+)[^\d]*?百万円/,
                経常利益: /経常利益[^\d]*?([\d,]+)[^\d]*?百万円/,
                当期純利益: /当期純利益[^\d]*?([\d,]+)[^\d]*?百万円/,
                総資産: /総資産[^\d]*?([\d,]+)[^\d]*?百万円/,
                純資産: /純資産[^\d]*?([\d,]+)[^\d]*?百万円/,
              };
              
              for (const [key, pattern] of Object.entries(patterns)) {
                const match = content.match(pattern);
                if (match) {
                  metrics[key] = parseInt(match[1].replace(/,/g, ''));
                }
              }
            }
          }
          return metrics;
        };
        
        const currentMetrics = extractMetrics(currentData);
        const previousMetrics = args.compare_previous_year !== false ? extractMetrics(previousData) : {};
        
        // 主要財務指標
        resultText += '【主要財務指標】\n';
        const hasMetrics = Object.keys(currentMetrics).length > 0;
        
        if (hasMetrics) {
          for (const [key, value] of Object.entries(currentMetrics)) {
            resultText += `${key}: ${value.toLocaleString()}百万円`;
            
            if (previousMetrics[key]) {
              const change = value - previousMetrics[key];
              const changeRate = ((change / previousMetrics[key]) * 100).toFixed(1);
              const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
              resultText += ` ${arrow} ${changeRate > 0 ? '+' : ''}${changeRate}%`;
            }
            resultText += '\n';
          }
        } else {
          resultText += '（財務データの抽出に失敗しました）\n';
        }
        
        // 財務比率分析
        if (hasMetrics) {
          resultText += '\n【財務比率分析】\n';
          
          if (currentMetrics.営業利益 && currentMetrics.売上高) {
            const margin = (currentMetrics.営業利益 / currentMetrics.売上高 * 100).toFixed(1);
            resultText += `📈 営業利益率: ${margin}%\n`;
          }
          
          if (currentMetrics.当期純利益 && currentMetrics.純資産) {
            const roe = (currentMetrics.当期純利益 / currentMetrics.純資産 * 100).toFixed(1);
            resultText += `📊 ROE（自己資本利益率）: ${roe}%\n`;
          }
          
          if (currentMetrics.当期純利益 && currentMetrics.総資産) {
            const roa = (currentMetrics.当期純利益 / currentMetrics.総資産 * 100).toFixed(1);
            resultText += `📉 ROA（総資産利益率）: ${roa}%\n`;
          }
          
          if (currentMetrics.純資産 && currentMetrics.総資産) {
            const equityRatio = (currentMetrics.純資産 / currentMetrics.総資産 * 100).toFixed(1);
            resultText += `💰 自己資本比率: ${equityRatio}%\n`;
          }
        }
        
        return {
          content: [{
            type: "text",
            text: resultText,
          }],
        };
      }

      case "compare_companies": {
        if (!args.company_names || args.company_names.length === 0) {
          return {
            content: [{
              type: "text",
              text: "比較する企業名を指定してください。",
            }],
          };
        }
        
        const year = args.fiscal_year || '2024';
        let resultText = `📊【企業比較分析】${year}年度\n`;
        resultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // 各企業のデータを取得
        const companiesData = [];
        for (const companyName of args.company_names) {
          const companies = await searchCompaniesByName(companyName);
          if (companies.length > 0) {
            const companyId = companies[0].company_id;
            const data = await makeApiRequest('/markdown-documents', {}, 'POST', {
              company_id: companyId,
              fiscal_year: year,
            });
            
            companiesData.push({
              name: companies[0].company_name,
              id: companyId,
              data: data
            });
          }
        }
        
        if (companiesData.length === 0) {
          return {
            content: [{
              type: "text",
              text: "指定された企業が見つかりませんでした。",
            }],
          };
        }
        
        // 各企業の財務指標を抽出
        resultText += '【比較結果】\n\n';
        
        const metrics = args.metrics || ["売上高", "営業利益", "当期純利益", "営業利益率"];
        
        companiesData.forEach(company => {
          resultText += `▼ ${company.name}\n`;
          
          if (company.data.documents && company.data.documents.length > 0) {
            const doc = company.data.documents.find(d => d.content);
            if (doc) {
              const content = doc.content;
              
              metrics.forEach(metric => {
                if (metric === "営業利益率") {
                  const salesMatch = content.match(/売上高[^\d]*?([\d,]+)/);
                  const profitMatch = content.match(/営業利益[^\d]*?([\d,]+)/);
                  if (salesMatch && profitMatch) {
                    const sales = parseInt(salesMatch[1].replace(/,/g, ''));
                    const profit = parseInt(profitMatch[1].replace(/,/g, ''));
                    const rate = (profit / sales * 100).toFixed(1);
                    resultText += `  ${metric}: ${rate}%\n`;
                  }
                } else {
                  const pattern = new RegExp(`${metric}[^\\d]*?([\\d,]+)`);
                  const match = content.match(pattern);
                  if (match) {
                    resultText += `  ${metric}: ${match[1]}百万円\n`;
                  }
                }
              });
            }
          }
          resultText += '\n';
        });
        
        return {
          content: [{
            type: "text",
            text: resultText,
          }],
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
        };
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [{
        type: "text",
        text: `エラーが発生しました: ${error.message}\n\nAPIサーバーが起動していることを確認してください。`,
      }],
    };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XBRL MCP Server v0.5.0 started - BFF Integration");
  if (IS_BFF_MODE) {
    console.error("✅ BFF mode enabled (no Service Key required)");
    console.error(`📍 BFF URL: ${BFF_URL}`);
  } else {
    console.error("⚠️ Using legacy API mode");
  }
}

// main関数をエクスポート
export { main };

// このファイルが直接実行された場合のみサーバーを起動
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}