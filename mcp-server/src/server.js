/**
 * XBRL Financial Data MCP Server v0.4.1
 * company_name検索最適化版 - Fixed module export
 * 
 * このMCPサーバーは、日本の上場企業の財務文書へのアクセスを提供します。
 * company_nameパラメータで直接検索可能です。
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

// 企業名から企業情報を検索する関数（改善版）
async function searchCompaniesByName(companyName) {
  try {
    console.error(`Searching for company: ${companyName}`);
    
    // まず markdown-documents API で検索（より多くのデータがある）
    const searchQuery = encodeURIComponent(companyName);
    const data = await makeApiRequest('/markdown-documents', {
      query: searchQuery,
      limit: 20
    });
    
    if (data.data && data.data.length > 0) {
      // 企業IDと企業名のユニークなペアを収集
      const companies = new Map();
      data.data.forEach(doc => {
        if (doc.company_id && doc.company_name) {
          // 重複を避けるためMapを使用
          if (!companies.has(doc.company_id)) {
            companies.set(doc.company_id, {
              company_id: doc.company_id,
              company_name: doc.company_name,
              fiscal_years: new Set()
            });
          }
          // 利用可能な年度を追加
          if (doc.fiscal_year) {
            companies.get(doc.company_id).fiscal_years.add(doc.fiscal_year);
          }
        }
      });
      
      // Mapを配列に変換し、年度情報も含める
      return Array.from(companies.values()).map(company => ({
        company_id: company.company_id,
        company_name: company.company_name,
        available_years: Array.from(company.fiscal_years).sort()
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
        company_name: company.name,
        description: company.description
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
    version: "0.4.1",
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
        
        // ドキュメント取得
        if (args.include_content) {
          // POSTメソッドで詳細取得
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
            
            // 主要な文書のみ表示
            const importantDocs = data.documents.filter(doc => 
              doc.file_name && (
                doc.file_name.includes('0102010') || // 事業の状況
                doc.file_name.includes('0103010') || // 設備の状況
                doc.file_name.includes('0104010')    // 経理の状況
              )
            );
            
            importantDocs.forEach((doc, index) => {
              resultText += `--- 文書 ${index + 1} ---\n`;
              resultText += `📄 ${doc.file_name}\n`;
              
              if (doc.content) {
                // 内容から重要な部分を抽出
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
          // GETメソッドでメタデータのみ取得
          const data = await makeApiRequest('/markdown-documents', {
            company_id: targetCompanyId,
            fiscal_year: args.fiscal_year,
            limit: 20,
          });
          
          let resultText = `【${targetCompanyName || targetCompanyId}】の文書一覧\n\n`;
          
          if (data.data && data.data.length > 0) {
            resultText += `📁 総文書数: ${data.pagination?.total || data.data.length}件\n\n`;
            
            // 年度別にグループ化
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
  console.error("XBRL MCP Server v0.4.1 started - company_name検索最適化版");
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