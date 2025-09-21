const XLSX = require('xlsx');
const fs = require('fs');

class PandasStyleDataAnalyzer {
    constructor() {
        this.df = null;
        this.statistics = {};
        this.insights = [];
    }

    // Excelファイルを読み込み、DataFrameライクなオブジェクトを作成
    loadExcel(filePath) {
        console.log('Excelファイルを読み込み中...');

        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // ヘッダーとデータを分離
        const headers = jsonData[0];
        const data = jsonData.slice(1);

        // DataFrameライクなオブジェクトを作成
        this.df = {
            headers: headers,
            data: data,
            columns: {
                docID: 0,
                companyName: 1,
                documentName: 2,
                submitDate: 3,
                securitiesCode: 4,
                isinCode: 5,
                companyNameJa: 6,
                companyNameEn: 7,
                category: 8,
                coreBusinessOperator: 9
            },
            length: data.length
        };

        console.log(`データ読み込み完了: ${this.df.length}行 × ${headers.length}列`);
        return this.df;
    }

    // データの基本統計を計算
    describe() {
        console.log('\\n=== データ基本統計 ===');

        const cols = this.df.columns;
        this.statistics = {
            totalRows: this.df.length,
            securitiesCodeStats: this.analyzeColumn(cols.securitiesCode),
            englishNameStats: this.analyzeColumn(cols.companyNameEn),
            japaneseName: this.analyzeColumn(cols.companyNameJa),
            category: this.analyzeColumn(cols.category),
            completeness: this.calculateCompleteness()
        };

        // 統計情報を表示
        console.log(`総行数: ${this.statistics.totalRows.toLocaleString()}`);
        console.log(`証券コード: ${this.statistics.securitiesCodeStats.nonNull.toLocaleString()}行 (${(this.statistics.securitiesCodeStats.nonNullRate*100).toFixed(1)}%)`);
        console.log(`英語名: ${this.statistics.englishNameStats.nonNull.toLocaleString()}行 (${(this.statistics.englishNameStats.nonNullRate*100).toFixed(1)}%)`);
        console.log(`和名: ${this.statistics.japaneseName.nonNull.toLocaleString()}行 (${(this.statistics.japaneseName.nonNullRate*100).toFixed(1)}%)`);
        console.log(`両方完備: ${this.statistics.completeness.bothComplete.toLocaleString()}行 (${(this.statistics.completeness.bothCompleteRate*100).toFixed(1)}%)`);

        return this.statistics;
    }

    // 特定列の統計を分析
    analyzeColumn(columnIndex) {
        let nullCount = 0;
        let nonNullCount = 0;
        const uniqueValues = new Set();

        for (const row of this.df.data) {
            const value = row[columnIndex];
            if (value === undefined || value === null || value === '') {
                nullCount++;
            } else {
                nonNullCount++;
                uniqueValues.add(value.toString());
            }
        }

        return {
            null: nullCount,
            nonNull: nonNullCount,
            nullRate: nullCount / this.df.length,
            nonNullRate: nonNullCount / this.df.length,
            unique: uniqueValues.size,
            uniqueValues: Array.from(uniqueValues).slice(0, 10) // 最初の10個のみ
        };
    }

    // データの完全性を計算
    calculateCompleteness() {
        const cols = this.df.columns;
        let bothComplete = 0;
        let secCodeOnly = 0;
        let engNameOnly = 0;
        let neitherComplete = 0;

        for (const row of this.df.data) {
            const hasSecCode = row[cols.securitiesCode] !== undefined &&
                              row[cols.securitiesCode] !== null &&
                              row[cols.securitiesCode] !== '';
            const hasEngName = row[cols.companyNameEn] !== undefined &&
                              row[cols.companyNameEn] !== null &&
                              row[cols.companyNameEn] !== '';

            if (hasSecCode && hasEngName) {
                bothComplete++;
            } else if (hasSecCode && !hasEngName) {
                secCodeOnly++;
            } else if (!hasSecCode && hasEngName) {
                engNameOnly++;
            } else {
                neitherComplete++;
            }
        }

        return {
            bothComplete,
            secCodeOnly,
            engNameOnly,
            neitherComplete,
            bothCompleteRate: bothComplete / this.df.length,
            secCodeOnlyRate: secCodeOnly / this.df.length,
            engNameOnlyRate: engNameOnly / this.df.length,
            neitherCompleteRate: neitherComplete / this.df.length
        };
    }

    // 企業名の頻度分析
    analyzeCompanyFrequency(columnIndex, topN = 30) {
        console.log('\\n=== 企業名頻度分析 ===');

        const companyFreq = new Map();
        const cols = this.df.columns;

        for (const row of this.df.data) {
            const companyName = row[columnIndex];
            const hasSecCode = row[cols.securitiesCode] !== undefined &&
                              row[cols.securitiesCode] !== null &&
                              row[cols.securitiesCode] !== '';
            const hasEngName = row[cols.companyNameEn] !== undefined &&
                              row[cols.companyNameEn] !== null &&
                              row[cols.companyNameEn] !== '';

            if (companyName && !hasSecCode && !hasEngName) {
                const count = companyFreq.get(companyName) || 0;
                companyFreq.set(companyName, count + 1);
            }
        }

        const sortedCompanies = Array.from(companyFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN);

        console.log(`未完成企業 上位${topN}社:`);
        sortedCompanies.forEach(([name, count], index) => {
            console.log(`${index + 1}. ${name}: ${count}回`);
        });

        return sortedCompanies;
    }

    // 企業カテゴリ分析
    analyzeCategoryDistribution() {
        console.log('\\n=== カテゴリ分析 ===');

        const cols = this.df.columns;
        const categoryStats = new Map();

        for (const row of this.df.data) {
            const category = row[cols.category] || 'その他';
            const hasSecCode = row[cols.securitiesCode] !== undefined &&
                              row[cols.securitiesCode] !== null &&
                              row[cols.securitiesCode] !== '';
            const hasEngName = row[cols.companyNameEn] !== undefined &&
                              row[cols.companyNameEn] !== null &&
                              row[cols.companyNameEn] !== '';

            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    total: 0,
                    withSecCode: 0,
                    withEngName: 0,
                    complete: 0
                });
            }

            const stats = categoryStats.get(category);
            stats.total++;
            if (hasSecCode) stats.withSecCode++;
            if (hasEngName) stats.withEngName++;
            if (hasSecCode && hasEngName) stats.complete++;
        }

        console.log('カテゴリ別統計:');
        for (const [category, stats] of categoryStats.entries()) {
            const completeness = (stats.complete / stats.total * 100).toFixed(1);
            console.log(`${category}: ${stats.total.toLocaleString()}件 (完全性: ${completeness}%)`);
        }

        return Object.fromEntries(categoryStats);
    }

    // 年度別分析
    analyzeByYear() {
        console.log('\\n=== 年度別分析 ===');

        const cols = this.df.columns;
        const yearStats = new Map();

        for (const row of this.df.data) {
            const submitDate = row[cols.submitDate];
            let year = 'その他';

            if (submitDate) {
                const dateStr = submitDate.toString();
                const yearMatch = dateStr.match(/(\\d{4})/);
                if (yearMatch) {
                    year = yearMatch[1];
                }
            }

            const hasSecCode = row[cols.securitiesCode] !== undefined &&
                              row[cols.securitiesCode] !== null &&
                              row[cols.securitiesCode] !== '';
            const hasEngName = row[cols.companyNameEn] !== undefined &&
                              row[cols.companyNameEn] !== null &&
                              row[cols.companyNameEn] !== '';

            if (!yearStats.has(year)) {
                yearStats.set(year, {
                    total: 0,
                    complete: 0
                });
            }

            const stats = yearStats.get(year);
            stats.total++;
            if (hasSecCode && hasEngName) stats.complete++;
        }

        const sortedYears = Array.from(yearStats.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));

        console.log('年度別完全性:');
        sortedYears.forEach(([year, stats]) => {
            const rate = (stats.complete / stats.total * 100).toFixed(1);
            console.log(`${year}年: ${stats.total.toLocaleString()}件 (完全性: ${rate}%)`);
        });

        return Object.fromEntries(yearStats);
    }

    // データ品質の洞察を生成
    generateInsights() {
        console.log('\\n=== データ品質の洞察 ===');

        const stats = this.statistics;
        this.insights = [];

        // 完全性の洞察
        if (stats.completeness.bothCompleteRate > 0.7) {
            this.insights.push({
                type: 'positive',
                message: `データ完全性は${(stats.completeness.bothCompleteRate*100).toFixed(1)}%と良好です`
            });
        } else {
            this.insights.push({
                type: 'improvement',
                message: `データ完全性は${(stats.completeness.bothCompleteRate*100).toFixed(1)}%で改善の余地があります`
            });
        }

        // 証券コードのみある場合
        if (stats.completeness.secCodeOnly > 0) {
            this.insights.push({
                type: 'opportunity',
                message: `${stats.completeness.secCodeOnly.toLocaleString()}行で証券コードから英語名を逆引き可能`
            });
        }

        // 英語名のみある場合
        if (stats.completeness.engNameOnly > 0) {
            this.insights.push({
                type: 'opportunity',
                message: `${stats.completeness.engNameOnly.toLocaleString()}行で英語名から証券コードを検索可能`
            });
        }

        // データ多様性
        const uniqueCompanies = stats.securitiesCodeStats.unique;
        this.insights.push({
            type: 'info',
            message: `${uniqueCompanies.toLocaleString()}の一意の証券コードが存在`
        });

        this.insights.forEach(insight => {
            const prefix = {
                positive: '✓',
                improvement: '!',
                opportunity: '→',
                info: 'i'
            }[insight.type];
            console.log(`${prefix} ${insight.message}`);
        });

        return this.insights;
    }

    // データクリーニングの提案
    suggestDataCleaning() {
        console.log('\\n=== データクリーニング提案 ===');

        const suggestions = [];

        // 重複データの確認
        const duplicateCheck = this.checkDuplicates();
        if (duplicateCheck.duplicates > 0) {
            suggestions.push(`重複データ: ${duplicateCheck.duplicates}件の重複を検出`);
        }

        // 企業名の正規化
        suggestions.push('企業名正規化: 「株式会社」「㈱」の統一');
        suggestions.push('スペース正規化: 全角・半角スペースの統一');

        // データ形式の統一
        suggestions.push('証券コード形式: 4桁数値への統一');
        suggestions.push('英語名形式: 大文字小文字の統一');

        suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });

        return suggestions;
    }

    // 重複データの確認
    checkDuplicates() {
        const seen = new Set();
        let duplicates = 0;
        const cols = this.df.columns;

        for (const row of this.df.data) {
            const key = `${row[cols.docID]}-${row[cols.companyName]}`;
            if (seen.has(key)) {
                duplicates++;
            } else {
                seen.add(key);
            }
        }

        return { duplicates, total: this.df.length };
    }

    // レポート生成
    generateReport(outputPath) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRows: this.df.length,
                completeness: this.statistics.completeness,
                dataQuality: {
                    securitiesCodeCoverage: this.statistics.securitiesCodeStats.nonNullRate,
                    englishNameCoverage: this.statistics.englishNameStats.nonNullRate,
                    overallCompleteness: this.statistics.completeness.bothCompleteRate
                }
            },
            insights: this.insights,
            topIncompleteCompanies: this.analyzeCompanyFrequency(this.df.columns.companyName, 20),
            categoryAnalysis: this.analyzeCategoryDistribution(),
            yearAnalysis: this.analyzeByYear(),
            recommendations: [
                'Yahoo Finance APIを使用した逆引き検索の実装',
                '企業名正規化アルゴリズムの適用',
                '業界データベースとのクロスマッチング',
                '手動検証が必要な企業リストの作成'
            ]
        };

        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`\\nレポートを${outputPath}に保存しました`);

        return report;
    }

    // メイン実行
    async analyze(filePath, reportPath) {
        console.log('Pandas風データ分析を開始...');
        console.log('='.repeat(60));

        try {
            // 1. データ読み込み
            this.loadExcel(filePath);

            // 2. 基本統計
            this.describe();

            // 3. 企業頻度分析
            this.analyzeCompanyFrequency(this.df.columns.companyName);

            // 4. カテゴリ分析
            this.analyzeCategoryDistribution();

            // 5. 年度別分析
            this.analyzeByYear();

            // 6. 洞察生成
            this.generateInsights();

            // 7. データクリーニング提案
            this.suggestDataCleaning();

            // 8. レポート生成
            const report = this.generateReport(reportPath);

            console.log('\\n=== 分析完了 ===');
            console.log(`データ完全性: ${(report.summary.dataQuality.overallCompleteness*100).toFixed(2)}%`);
            console.log(`改善可能行数: ${(this.df.length - this.statistics.completeness.bothComplete).toLocaleString()}行`);

            return report;

        } catch (error) {
            console.error('分析中にエラーが発生しました:', error.message);
            throw error;
        }
    }
}

// メイン実行
async function main() {
    const analyzer = new PandasStyleDataAnalyzer();

    const inputPath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_final.xlsx';
    const reportPath = 'pandas_analysis_report.json';

    try {
        await analyzer.analyze(inputPath, reportPath);
    } catch (error) {
        console.error('処理中にエラーが発生しました:', error.message);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = PandasStyleDataAnalyzer;