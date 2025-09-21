const XLSX = require('xlsx');
const fs = require('fs');
const yahooFinance = require('yahoo-finance2').default;

class CompanyNameSearcher {
    constructor() {
        this.delay = 2000; // 2秒の遅延
        this.cache = new Map();
        this.successCount = 0;
        this.errorCount = 0;
        this.foundCompanies = [];
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 企業名を正規化
    normalizeCompanyName(name) {
        if (!name) return '';

        return name
            .replace(/株式会社|㈱/g, '')
            .replace(/[　\\s]+/g, ' ')
            .replace(/[・]/g, '')
            .replace(/　/g, ' ')
            .trim();
    }

    // Yahoo Finance検索APIを使用して企業を検索
    async searchCompany(companyName) {
        const normalizedName = this.normalizeCompanyName(companyName);

        if (this.cache.has(normalizedName)) {
            return this.cache.get(normalizedName);
        }

        try {
            console.log(`企業検索: ${companyName} (正規化: ${normalizedName})`);

            // 複数の検索パターンを試行
            const searchTerms = [
                normalizedName,
                normalizedName + ' japan',
                companyName,
                companyName.replace('株式会社', '')
            ];

            for (const searchTerm of searchTerms) {
                try {
                    const searchResults = await yahooFinance.search(searchTerm, {
                        lang: 'en-US',
                        region: 'US',
                        quotesCount: 10,
                        newsCount: 0
                    });

                    if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
                        // 日本企業を優先的に探す
                        const japaneseCompanies = searchResults.quotes.filter(quote =>
                            quote.exchange && (
                                quote.exchange.includes('Tokyo') ||
                                quote.exchange.includes('TSE') ||
                                quote.exchange.includes('JPX') ||
                                quote.symbol.endsWith('.T')
                            )
                        );

                        const candidates = japaneseCompanies.length > 0 ? japaneseCompanies : searchResults.quotes;

                        for (const quote of candidates.slice(0, 3)) {
                            // 企業名の類似性をチェック
                            if (this.isNameSimilar(companyName, quote.longName || quote.shortName)) {
                                const result = {
                                    success: true,
                                    symbol: quote.symbol,
                                    englishName: quote.longName || quote.shortName,
                                    shortName: quote.shortName,
                                    exchange: quote.exchange,
                                    sector: quote.sector,
                                    industry: quote.industry,
                                    searchTerm,
                                    originalName: companyName
                                };

                                this.cache.set(normalizedName, result);
                                this.successCount++;
                                this.foundCompanies.push(result);
                                console.log(`✓ 発見: ${companyName} → ${quote.symbol} (${quote.longName})`);
                                return result;
                            }
                        }
                    }
                } catch (searchError) {
                    console.log(`検索エラー (${searchTerm}): ${searchError.message}`);
                    continue;
                }
            }

            const errorResult = { success: false, error: 'No matching company found', originalName: companyName };
            this.cache.set(normalizedName, errorResult);
            this.errorCount++;
            console.log(`✗ ${companyName}: マッチする企業が見つかりませんでした`);
            return errorResult;

        } catch (error) {
            const errorResult = { success: false, error: error.message, originalName: companyName };
            this.cache.set(normalizedName, errorResult);
            this.errorCount++;
            console.log(`✗ ${companyName}: ${error.message}`);
            return errorResult;
        }
    }

    // 企業名の類似性チェック
    isNameSimilar(japaneseCompanyName, englishCompanyName) {
        if (!japaneseCompanyName || !englishCompanyName) return false;

        const normalizedJapanese = this.normalizeCompanyName(japaneseCompanyName).toLowerCase();
        const normalizedEnglish = englishCompanyName.toLowerCase();

        // キーワードベースのマッチング
        const japaneseKeywords = normalizedJapanese.split(/[\\s\\u3000]+/);
        const englishKeywords = normalizedEnglish.split(/[\\s]+/);

        // 共通キーワードの検出
        for (const jKeyword of japaneseKeywords) {
            if (jKeyword.length > 2) {
                for (const eKeyword of englishKeywords) {
                    if (eKeyword.length > 2 &&
                        (eKeyword.includes(jKeyword) || jKeyword.includes(eKeyword))) {
                        return true;
                    }
                }
            }
        }

        // 特定のパターンマッチング
        const patterns = [
            { japanese: /ソフトバンク/, english: /softbank/i },
            { japanese: /トヨタ/, english: /toyota/i },
            { japanese: /ホンダ/, english: /honda/i },
            { japanese: /ソニー/, english: /sony/i },
            { japanese: /パナソニック/, english: /panasonic/i },
            { japanese: /日産/, english: /nissan/i },
            { japanese: /キヤノン/, english: /canon/i },
            { japanese: /富士通/, english: /fujitsu/i }
        ];

        for (const pattern of patterns) {
            if (pattern.japanese.test(japaneseCompanyName) && pattern.english.test(englishCompanyName)) {
                return true;
            }
        }

        return false;
    }

    // 未完成企業の抽出
    extractIncompleteCompanies(filePath, maxCompanies = 30) {
        console.log('未完成企業を抽出中...');

        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const securitiesCodeIndex = 4;
        const companyNameEnIndex = 7;
        const companyNameIndex = 1;
        const companyNameJaIndex = 6;

        const incompleteCompanies = new Map();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const securitiesCode = row[securitiesCodeIndex];
            const englishName = row[companyNameEnIndex];
            const companyName = row[companyNameJaIndex] || row[companyNameIndex];

            const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
            const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

            if (!hasSecCode && !hasEngName && companyName) {
                const count = incompleteCompanies.get(companyName) || 0;
                incompleteCompanies.set(companyName, count + 1);
            }
        }

        // 頻度順にソート
        const sortedCompanies = Array.from(incompleteCompanies.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxCompanies)
            .map(([name, count]) => ({ name, count }));

        console.log(`未完成企業: ${sortedCompanies.length}社を抽出`);
        return sortedCompanies;
    }

    // メイン検索処理
    async searchIncompleteCompanies(filePath, outputPath, maxCompanies = 30) {
        try {
            console.log('企業名検索を開始...');
            console.log('='.repeat(60));

            // 1. 未完成企業を抽出
            const incompleteCompanies = this.extractIncompleteCompanies(filePath, maxCompanies);

            if (incompleteCompanies.length === 0) {
                console.log('未完成企業が見つかりませんでした。');
                return;
            }

            // 2. 各企業を検索
            console.log(`\\n${incompleteCompanies.length}社の企業を検索します...`);

            const searchResults = {};

            for (let i = 0; i < incompleteCompanies.length; i++) {
                const company = incompleteCompanies[i];

                console.log(`\\n[${i + 1}/${incompleteCompanies.length}] ${company.name} (${company.count}件)`);

                const result = await this.searchCompany(company.name);
                searchResults[company.name] = {
                    ...result,
                    frequency: company.count
                };

                // レート制限回避
                if (i < incompleteCompanies.length - 1) {
                    await this.sleep(this.delay);
                }

                // 進捗表示
                if ((i + 1) % 5 === 0) {
                    console.log(`\\n進捗: ${i + 1}/${incompleteCompanies.length} (発見: ${this.successCount}, 未発見: ${this.errorCount})`);
                }
            }

            // 3. 結果レポート作成
            const searchReport = {
                timestamp: new Date().toISOString(),
                totalSearched: incompleteCompanies.length,
                foundCompanies: this.successCount,
                notFound: this.errorCount,
                successRate: ((this.successCount / incompleteCompanies.length) * 100).toFixed(2),
                results: searchResults,
                foundCompaniesList: this.foundCompanies
            };

            fs.writeFileSync('company_search_report.json', JSON.stringify(searchReport, null, 2));
            console.log('\\n検索レポートをcompany_search_report.jsonに保存しました');

            // 4. 発見された企業の表示
            console.log('\\n=== 検索結果 ===');
            console.log(`検索企業数: ${incompleteCompanies.length}`);
            console.log(`発見企業数: ${this.successCount}`);
            console.log(`成功率: ${searchReport.successRate}%`);

            if (this.foundCompanies.length > 0) {
                console.log('\\n発見された企業:');
                this.foundCompanies.forEach((company, index) => {
                    console.log(`${index + 1}. ${company.originalName}`);
                    console.log(`   → ${company.symbol}: ${company.englishName}`);
                    console.log(`   取引所: ${company.exchange || 'N/A'}`);
                    if (company.sector) console.log(`   業界: ${company.sector}`);
                    console.log('');
                });

                // Excel更新用のデータを準備
                const updateData = {};
                this.foundCompanies.forEach(company => {
                    // 証券コードから.Tサフィックスを除去
                    const cleanSymbol = company.symbol.replace('.T', '');
                    updateData[company.originalName] = {
                        securitiesCode: isNaN(cleanSymbol) ? null : parseInt(cleanSymbol),
                        englishName: company.englishName
                    };
                });

                // Excel更新
                if (Object.keys(updateData).length > 0) {
                    const updateResult = await this.updateExcelWithSearchResults(filePath, outputPath, updateData);
                    console.log(`Excelファイル更新: ${updateResult.updateCount}行`);
                }
            }

            return searchReport;

        } catch (error) {
            console.error('検索処理中にエラーが発生しました:', error.message);
            throw error;
        }
    }

    // 検索結果でExcelファイルを更新
    async updateExcelWithSearchResults(inputPath, outputPath, updateData) {
        console.log('\\n検索結果でExcelファイルを更新中...');

        const workbook = XLSX.readFile(inputPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const securitiesCodeIndex = 4;
        const companyNameEnIndex = 7;
        const companyNameIndex = 1;
        const companyNameJaIndex = 6;

        let updateCount = 0;
        const updatedRows = [];

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const companyName = row[companyNameJaIndex] || row[companyNameIndex];

            if (companyName && updateData[companyName]) {
                const updateInfo = updateData[companyName];
                let updated = false;

                // 証券コードを更新
                if (updateInfo.securitiesCode &&
                    (!row[securitiesCodeIndex] || row[securitiesCodeIndex] === '')) {
                    row[securitiesCodeIndex] = updateInfo.securitiesCode;
                    updated = true;
                }

                // 英語名を更新
                if (updateInfo.englishName &&
                    (!row[companyNameEnIndex] || row[companyNameEnIndex] === '')) {
                    row[companyNameEnIndex] = updateInfo.englishName;
                    updated = true;
                }

                if (updated) {
                    updateCount++;
                    updatedRows.push({
                        row: i + 1,
                        company: companyName,
                        securitiesCode: updateInfo.securitiesCode,
                        englishName: updateInfo.englishName
                    });
                }
            }
        }

        // 更新されたデータを保存
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
        XLSX.writeFile(newWorkbook, outputPath);

        console.log(`更新完了: ${updateCount}行を更新`);
        console.log(`出力ファイル: ${outputPath}`);

        return {
            updateCount,
            updatedRows
        };
    }
}

// メイン実行
async function main() {
    const searcher = new CompanyNameSearcher();

    const inputPath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_final.xlsx';
    const outputPath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_search_enhanced.xlsx';

    try {
        await searcher.searchIncompleteCompanies(inputPath, outputPath, 20); // 上位20社を検索
    } catch (error) {
        console.error('処理中にエラーが発生しました:', error.message);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = CompanyNameSearcher;