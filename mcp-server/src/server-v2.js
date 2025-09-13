/**
 * XBRL Financial Data MCP Server v0.3.0
 * 企業名検索対応版
 * 
 * このMCPサーバーは、日本の上場企業の財務文書へのアクセスを提供します。
 * 企業名での検索、企業IDでの検索の両方に対応しています。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// APIの設定
const API_URL = process.env.XBRL_API_URL || 'http://localhost:3005/api/v1';
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_test_key_123';

// 企業名とIDのマッピングキャッシュ
let companyCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000; // 1時間

// APIリクエストを送信する共通関数
async function makeApiRequest(endpoint, params = {}, method = 'GET', body = null) {
  const url = new URL(`${API_URL}${endpoint}`);
  
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

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

// 企業名から企業IDを検索する関数
async function searchCompanyByName(companyName) {
  try {
    // まず markdown-documents API で検索
    const searchQuery = encodeURIComponent(companyName);
    const data = await makeApiRequest('/markdown-documents', {
      query: searchQuery,
      limit: 10
    });
    
    if (data.data && data.data.length > 0) {
      // 企業IDと企業名のペアを収集
      const companies = {};
      data.data.forEach(doc => {
        if (doc.company_id && doc.company_name) {
          companies[doc.company_id] = doc.company_name;
        }
      });
      
      return Object.entries(companies).map(([id, name]) => ({
        company_id: id,
        company_name: name
      }));
    }
    
    // 見つからない場合は companies API も試す
    const companiesData = await makeApiRequest('/companies', {
      search: companyName,
      limit: 10
    });
    
    if (companiesData.data && companiesData.data.length > 0) {
      return companiesData.data.map(company => ({
        company_id: company.id,
        company_name: company.name
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Company search error:', error);
    return [];
  }
}

// MCPサーバーの作成
const server = new Server(
  {
    name: "xbrl-api-server",
    version: "0.3.0",
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
        name: "search_companies",
        description: "企業名で企業を検索し、企業IDを取得します",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "検索する企業名（部分一致可）例: 亀田製菓、トヨタ、ソニー",
            },
          },
          required: ["company_name"],
        },
      },
      {
        name: "get_financial_documents",
        description: "企業の財務文書を取得します（企業名または企業IDで指定）",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "企業名（例: 亀田製菓株式会社）",
            },
            company_id: {
              type: "string",
              description: "企業ID（例: S100TMYO）",
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
            limit: {
              type: "number",
              description: "取得件数（デフォルト: 10）",
              default: 10,
            },
          },
        },
      },
      {
        name: "get_company_financial_data",
        description: "企業の財務データを取得・分析します（企業名でも検索可能）",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "企業名（例: 亀田製菓）",
            },
            company_id: {
              type: "string",
              description: "企業ID（例: S100TMYO）",
            },
            fiscal_year: {
              type: "string",
              description: "会計年度（例: 2024）",
            },
          },
        },
      },
      {
        name: "analyze_financial_metrics",
        description: "企業の財務指標を分析します（売上高、利益率、ROE等）",
        inputSchema: {
          type: "object",
          properties: {
            company_name: {
              type: "string",
              description: "企業名（例: 亀田製菓）",
            },
            company_id: {
              type: "string",
              description: "企業ID（代替）",
            },
            fiscal_year: {
              type: "string",
              description: "分析対象年度",
            },
          },
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
      case "search_companies": {
        const companies = await searchCompanyByName(args.company_name);
        
        if (companies.length === 0) {
          return {
            content: [{
              type: "text",
              text: `「${args.company_name}」に該当する企業が見つかりませんでした。企業名を確認してください。`,
            }],
          };
        }
        
        let resultText = `「${args.company_name}」の検索結果:\n\n`;
        companies.forEach((company, index) => {
          resultText += `${index + 1}. ${company.company_name}\n`;
          resultText += `   企業ID: ${company.company_id}\n\n`;
        });
        
        return {
          content: [{
            type: "text",
            text: resultText,
          }],
        };
      }

      case "get_financial_documents": {
        let targetCompanyId = args.company_id;
        let targetCompanyName = args.company_name;
        
        // 企業名が指定されていて、企業IDがない場合は検索
        if (args.company_name && !args.company_id) {
          const companies = await searchCompanyByName(args.company_name);
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
        
        // markdown-documents APIを使用
        const params = {
          company_id: targetCompanyId,
          fiscal_year: args.fiscal_year,
          include_content: args.include_content,
          limit: args.limit || 10,
        };
        
        if (args.include_content) {
          // POSTメソッドで詳細取得
          const data = await makeApiRequest('/markdown-documents', {}, 'POST', {
            company_id: targetCompanyId,
            fiscal_year: args.fiscal_year,
          });
          
          let resultText = `${targetCompanyName || targetCompanyId}の財務文書:\n\n`;
          
          if (data.documents && data.documents.length > 0) {
            resultText += `取得文書数: ${data.documents.length}件\n`;
            resultText += `成功: ${data.summary?.successful_downloads || 0}件\n`;
            resultText += `失敗: ${data.summary?.failed_downloads || 0}件\n\n`;
            
            data.documents.forEach((doc, index) => {
              resultText += `--- 文書 ${index + 1} ---\n`;
              resultText += `ファイル: ${doc.file_name}\n`;
              
              if (doc.content) {
                resultText += `内容（最初の1000文字）:\n${doc.content.substring(0, 1000)}\n\n`;
              } else {
                resultText += `内容: 取得失敗\n\n`;
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
          // GETメソッドでメタデータのみ取得
          const data = await makeApiRequest('/markdown-documents', params);
          
          let resultText = `${targetCompanyName || targetCompanyId}の財務文書一覧:\n\n`;
          
          if (data.data && data.data.length > 0) {
            resultText += `総数: ${data.pagination?.total || data.data.length}件\n\n`;
            
            data.data.forEach((doc, index) => {
              resultText += `${index + 1}. ${doc.file_name}\n`;
              resultText += `   年度: ${doc.fiscal_year}\n`;
              resultText += `   タイプ: ${doc.file_type || 'unknown'}\n\n`;
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

      case "get_company_financial_data": {
        let targetCompanyId = args.company_id;
        let targetCompanyName = args.company_name;
        
        // 企業名から企業IDを取得
        if (args.company_name && !args.company_id) {
          const companies = await searchCompanyByName(args.company_name);
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
        
        // 財務データを取得
        const data = await makeApiRequest('/markdown-documents', {}, 'POST', {
          company_id: targetCompanyId,
          fiscal_year: args.fiscal_year,
        });
        
        let resultText = `${targetCompanyName || targetCompanyId}の財務データ分析:\n\n`;
        
        if (data.company) {
          resultText += `企業名: ${data.company.name}\n`;
          resultText += `企業ID: ${data.company.id}\n`;
          resultText += `説明: ${data.company.description || 'N/A'}\n\n`;
        }
        
        if (data.documents && data.documents.length > 0) {
          // 事業概況を探す
          const businessDoc = data.documents.find(d => 
            d.file_name && d.file_name.includes('0102010_honbun')
          );
          
          if (businessDoc && businessDoc.content) {
            resultText += "【事業の状況】\n";
            const content = businessDoc.content;
            
            // 売上高、利益などの数値を抽出
            const salesMatch = content.match(/売上高[^\d]*?([\d,]+)/);
            const profitMatch = content.match(/営業利益[^\d]*?([\d,]+)/);
            const netIncomeMatch = content.match(/当期純利益[^\d]*?([\d,]+)/);
            
            if (salesMatch) resultText += `売上高: ${salesMatch[1]}百万円\n`;
            if (profitMatch) resultText += `営業利益: ${profitMatch[1]}百万円\n`;
            if (netIncomeMatch) resultText += `当期純利益: ${netIncomeMatch[1]}百万円\n`;
            
            resultText += "\n";
          }
          
          resultText += `取得文書数: ${data.documents.length}件\n`;
        } else {
          resultText += "財務データが見つかりませんでした。\n";
        }
        
        return {
          content: [{
            type: "text",
            text: resultText,
          }],
        };
      }

      case "analyze_financial_metrics": {
        let targetCompanyId = args.company_id;
        let targetCompanyName = args.company_name;
        
        // 企業名から企業IDを取得
        if (args.company_name && !args.company_id) {
          const companies = await searchCompanyByName(args.company_name);
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
        
        // 複数年度のデータを取得して分析
        const currentYear = args.fiscal_year || '2024';
        const previousYear = String(parseInt(currentYear) - 1);
        
        const [currentData, previousData] = await Promise.all([
          makeApiRequest('/markdown-documents', {}, 'POST', {
            company_id: targetCompanyId,
            fiscal_year: currentYear,
          }),
          makeApiRequest('/markdown-documents', {}, 'POST', {
            company_id: targetCompanyId,
            fiscal_year: previousYear,
          }),
        ]);
        
        let resultText = `${targetCompanyName || targetCompanyId}の財務指標分析\n`;
        resultText += `対象年度: ${currentYear}年度（前年度比較あり）\n\n`;
        
        // 財務指標の抽出と計算
        const extractMetrics = (data) => {
          const metrics = {};
          if (data.documents && data.documents.length > 0) {
            const businessDoc = data.documents.find(d => 
              d.file_name && d.file_name.includes('honbun') && d.content
            );
            
            if (businessDoc && businessDoc.content) {
              const content = businessDoc.content;
              
              // 数値抽出（より柔軟なパターン）
              const patterns = {
                売上高: /売上高[^\d]*?([\d,]+)/,
                営業利益: /営業利益[^\d]*?([\d,]+)/,
                経常利益: /経常利益[^\d]*?([\d,]+)/,
                当期純利益: /当期純利益[^\d]*?([\d,]+)/,
                総資産: /総資産[^\d]*?([\d,]+)/,
                純資産: /純資産[^\d]*?([\d,]+)/,
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
        const previousMetrics = extractMetrics(previousData);
        
        // 財務指標の表示
        resultText += "【主要財務指標】\n";
        for (const [key, value] of Object.entries(currentMetrics)) {
          resultText += `${key}: ${value.toLocaleString()}百万円`;
          
          if (previousMetrics[key]) {
            const growth = ((value - previousMetrics[key]) / previousMetrics[key] * 100).toFixed(1);
            resultText += ` (前年度比: ${growth > 0 ? '+' : ''}${growth}%)`;
          }
          resultText += "\n";
        }
        
        // 財務比率の計算
        resultText += "\n【財務比率分析】\n";
        
        if (currentMetrics.営業利益 && currentMetrics.売上高) {
          const margin = (currentMetrics.営業利益 / currentMetrics.売上高 * 100).toFixed(1);
          resultText += `営業利益率: ${margin}%\n`;
        }
        
        if (currentMetrics.当期純利益 && currentMetrics.純資産) {
          const roe = (currentMetrics.当期純利益 / currentMetrics.純資産 * 100).toFixed(1);
          resultText += `ROE (自己資本利益率): ${roe}%\n`;
        }
        
        if (currentMetrics.当期純利益 && currentMetrics.総資産) {
          const roa = (currentMetrics.当期純利益 / currentMetrics.総資産 * 100).toFixed(1);
          resultText += `ROA (総資産利益率): ${roa}%\n`;
        }
        
        if (currentMetrics.純資産 && currentMetrics.総資産) {
          const equityRatio = (currentMetrics.純資産 / currentMetrics.総資産 * 100).toFixed(1);
          resultText += `自己資本比率: ${equityRatio}%\n`;
        }
        
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
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`,
      }],
    };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XBRL MCP Server v0.3.0 started - 企業名検索対応版");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});