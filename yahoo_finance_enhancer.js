const XLSX = require('xlsx');
const fs = require('fs');
const yahooFinance = require('yahoo-finance2').default;

class FinancialDataEnhancer {
    constructor() {
        this.delay = 1000; // 1秒の遅延でレート制限を回避
        this.cache = new Map(); // キャッシュで重複リクエストを避ける
        this.successCount = 0;
        this.errorCount = 0;
    }

    // 遅延を追加
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Yahoo Finance APIから企業情報を取得
    async getCompanyInfo(ticker) {
        if (this.cache.has(ticker)) {
            return this.cache.get(ticker);
        }

        try {
            console.log(`Yahoo Finance APIで ${ticker} を取得中...`);

            // 日本の証券コードにはサフィックスを追加
            const symbol = ticker.toString().length === 4 ? `${ticker}.T` : ticker;

            const quote = await yahooFinance.quote(symbol);

            if (quote && quote.longName) {
                const result = {
                    success: true,
                    englishName: quote.longName,
                    shortName: quote.shortName,
                    symbol: quote.symbol,
                    exchange: quote.fullExchangeName,
                    currency: quote.currency,
                    marketCap: quote.marketCap,
                    sector: quote.sector,
                    industry: quote.industry
                };

                this.cache.set(ticker, result);
                this.successCount++;
                console.log(`✓ ${ticker}: ${result.englishName}`);
                return result;
            } else {
                const errorResult = { success: false, error: 'No data found' };
                this.cache.set(ticker, errorResult);
                this.errorCount++;
                console.log(`✗ ${ticker}: データが見つかりません`);
                return errorResult;
            }
        } catch (error) {
            const errorResult = { success: false, error: error.message };
            this.cache.set(ticker, errorResult);
            this.errorCount++;
            console.log(`✗ ${ticker}: ${error.message}`);
            return errorResult;
        }
    }

    // 証券コードのリストから企業情報を一括取得
    async batchGetCompanyInfo(tickers, maxRequests = 50) {
        const results = {};
        const uniqueTickers = [...new Set(tickers)].slice(0, maxRequests);

        console.log(`\\n${uniqueTickers.length}個の証券コードを処理します...`);

        for (let i = 0; i < uniqueTickers.length; i++) {
            const ticker = uniqueTickers[i];

            if (ticker && ticker !== '' && !isNaN(ticker)) {
                results[ticker] = await this.getCompanyInfo(ticker);

                // レート制限を避けるための遅延
                if (i < uniqueTickers.length - 1) {
                    await this.sleep(this.delay);
                }

                // 進捗表示
                if ((i + 1) % 10 === 0) {
                    console.log(`進捗: ${i + 1}/${uniqueTickers.length} (成功: ${this.successCount}, エラー: ${this.errorCount})`);
                }
            }
        }

        return results;
    }

    // Excelファイルから証券コードを抽出
    extractSecuritiesCodes(filePath) {
        console.log('Excelファイルから証券コードを抽出中...');

        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const securitiesCodeIndex = 4;
        const companyNameEnIndex = 7;

        const missingEnglishNames = [];
        const securitiesCodes = new Set();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const securitiesCode = row[securitiesCodeIndex];
            const englishName = row[companyNameEnIndex];

            const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
            const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

            if (hasSecCode && !hasEngName) {
                securitiesCodes.add(securitiesCode.toString());
                missingEnglishNames.push({
                    row: i + 1,
                    securitiesCode: securitiesCode.toString(),
                    companyName: row[6] || row[1] // 日本語企業名
                });
            }
        }

        console.log(`英語名が不足している証券コード: ${securitiesCodes.size}個`);
        return {
            securitiesCodes: Array.from(securitiesCodes),
            missingData: missingEnglishNames
        };
    }

    // Excelファイルを更新
    async updateExcelFile(inputPath, outputPath, apiResults) {
        console.log('Excelファイルを更新中...');

        const workbook = XLSX.readFile(inputPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const securitiesCodeIndex = 4;
        const companyNameEnIndex = 7;

        let updateCount = 0;
        const updatedRows = [];

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const securitiesCode = row[securitiesCodeIndex];
            const englishName = row[companyNameEnIndex];

            const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
            const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

            if (hasSecCode && !hasEngName) {
                const codeStr = securitiesCode.toString();
                const apiResult = apiResults[codeStr];

                if (apiResult && apiResult.success && apiResult.englishName) {
                    row[companyNameEnIndex] = apiResult.englishName;
                    updateCount++;
                    updatedRows.push({
                        row: i + 1,
                        securitiesCode: codeStr,
                        englishName: apiResult.englishName,
                        shortName: apiResult.shortName,
                        sector: apiResult.sector,
                        industry: apiResult.industry
                    });
                }
            }
        }

        // 更新されたデータを保存
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
        XLSX.writeFile(newWorkbook, outputPath);

        console.log(`\\n更新完了: ${updateCount}行を更新しました`);
        console.log(`更新ファイル: ${outputPath}`);

        return {
            updateCount,
            updatedRows,
            totalProcessed: Object.keys(apiResults).length
        };
    }

    // メイン処理
    async enhance(inputPath, outputPath, maxRequests = 50) {
        try {
            console.log('Yahoo Finance APIを使用したデータ拡充を開始...');
            console.log('='.repeat(60));

            // 1. 証券コードを抽出
            const { securitiesCodes, missingData } = this.extractSecuritiesCodes(inputPath);

            if (securitiesCodes.length === 0) {
                console.log('英語名が不足している証券コードが見つかりませんでした。');
                return;
            }

            // 2. Yahoo Finance APIから情報を取得
            console.log(`\\n最大${maxRequests}件の証券コードを処理します...`);
            const apiResults = await this.batchGetCompanyInfo(securitiesCodes, maxRequests);

            // 3. 結果をファイルに保存
            const enhancementReport = {
                timestamp: new Date().toISOString(),
                processed: Object.keys(apiResults).length,
                successful: this.successCount,
                errors: this.errorCount,
                successRate: ((this.successCount / Object.keys(apiResults).length) * 100).toFixed(2),
                results: apiResults,
                missingData: missingData.slice(0, 20) // 最初の20件のみ
            };

            fs.writeFileSync('yahoo_finance_enhancement_report.json', JSON.stringify(enhancementReport, null, 2));
            console.log('\\nAPIレポートをyahoo_finance_enhancement_report.jsonに保存しました');

            // 4. Excelファイルを更新
            const updateResult = await this.updateExcelFile(inputPath, outputPath, apiResults);

            // 5. 最終レポート
            console.log('\\n=== Yahoo Finance API 拡充結果 ===');
            console.log(`処理した証券コード: ${Object.keys(apiResults).length}`);
            console.log(`API成功: ${this.successCount}`);
            console.log(`APIエラー: ${this.errorCount}`);
            console.log(`成功率: ${enhancementReport.successRate}%`);
            console.log(`Excelファイル更新: ${updateResult.updateCount}行`);

            if (updateResult.updatedRows.length > 0) {
                console.log('\\n更新された企業（最初の10件）:');
                updateResult.updatedRows.slice(0, 10).forEach(item => {
                    console.log(`  ${item.securitiesCode}: ${item.englishName}`);
                    if (item.sector) console.log(`    業界: ${item.sector}`);
                });
            }

            return updateResult;

        } catch (error) {
            console.error('エラー:', error.message);
            throw error;
        }
    }
}

// メイン実行
async function main() {
    const enhancer = new FinancialDataEnhancer();

    const inputPath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_final.xlsx';
    const outputPath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_yahoo_enhanced.xlsx';

    try {
        await enhancer.enhance(inputPath, outputPath, 100); // 最大100件のリクエスト
    } catch (error) {
        console.error('処理中にエラーが発生しました:', error.message);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = FinancialDataEnhancer;