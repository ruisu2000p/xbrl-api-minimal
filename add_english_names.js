const XLSX = require('xlsx');
const fs = require('fs');

class EnglishNameAdder {
    constructor() {
        this.matchedCount = 0;
        this.addedCount = 0;
        this.matchingResults = [];
    }

    // 追加依頼ファイルを読み込み
    loadAdditionalFile(filePath) {
        console.log('追加依頼ファイルを読み込み中...');

        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`読み込み完了: ${jsonData.length}行`);

        // ヘッダー行を確認
        const headers = jsonData[0];
        console.log('ヘッダー:', headers);

        // データを解析して企業名と英語名のマッピングを作成
        const companyMapping = new Map();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length >= 8) {
                const japaneseCompanyName = row[1]; // 2列目：企業名（日本語）
                const englishCompanyName = row[7]; // 8列目：英語名

                if (japaneseCompanyName && englishCompanyName) {
                    companyMapping.set(japaneseCompanyName.toString().trim(), englishCompanyName.toString().trim());
                }
            }
        }

        console.log(`企業マッピング作成完了: ${companyMapping.size}社`);

        // サンプル表示
        console.log('\\nサンプルマッピング（最初の10件）:');
        let count = 0;
        for (const [japanese, english] of companyMapping.entries()) {
            if (count >= 10) break;
            console.log(`${count + 1}. ${japanese} → ${english}`);
            count++;
        }

        return companyMapping;
    }

    // メインファイルを読み込み
    loadMainFile(filePath) {
        console.log('\\nメインファイルを読み込み中...');

        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`メインファイル読み込み完了: ${jsonData.length}行`);

        return {
            workbook,
            worksheet,
            data: jsonData,
            headers: jsonData[0]
        };
    }

    // 企業名の正規化（マッチング用）
    normalizeCompanyName(name) {
        if (!name) return '';

        return name.toString()
            .trim()
            .replace(/株式会社|㈱/g, '')
            .replace(/[　\\s]+/g, ' ')
            .replace(/[・]/g, '')
            .trim();
    }

    // 企業名マッチング
    findCompanyMatch(targetName, companyMapping) {
        if (!targetName) return null;

        // 完全一致を最初に試行
        if (companyMapping.has(targetName)) {
            return companyMapping.get(targetName);
        }

        // 正規化後の一致を試行
        const normalizedTarget = this.normalizeCompanyName(targetName);

        for (const [japanese, english] of companyMapping.entries()) {
            const normalizedJapanese = this.normalizeCompanyName(japanese);

            // 正規化後の完全一致
            if (normalizedTarget === normalizedJapanese) {
                return english;
            }

            // 部分一致（長い方が短い方を含む）
            if (normalizedTarget.length > 3 && normalizedJapanese.length > 3) {
                if (normalizedTarget.includes(normalizedJapanese) ||
                    normalizedJapanese.includes(normalizedTarget)) {
                    return english;
                }
            }
        }

        return null;
    }

    // メインファイルに英語名を追加
    addEnglishNames(mainFileData, companyMapping) {
        console.log('\\n英語名の追加処理を開始...');

        const { data } = mainFileData;
        const headers = data[0];

        // 列のインデックスを確認
        console.log('メインファイルのヘッダー:');
        headers.forEach((header, index) => {
            console.log(`${index + 1}. ${header}`);
        });

        const companyNameJaIndex = 6; // 会社名（和名）
        const companyNameEnIndex = 7; // 英語名
        const companyNameIndex = 1; // 企業名

        let updatedRows = 0;
        const updateLog = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            // 現在の英語名をチェック
            const currentEnglishName = row[companyNameEnIndex];
            const hasEnglishName = currentEnglishName !== undefined &&
                                  currentEnglishName !== null &&
                                  currentEnglishName !== '';

            if (!hasEnglishName) {
                // 日本語企業名を取得
                const japaneseCompanyName = row[companyNameJaIndex] || row[companyNameIndex];

                if (japaneseCompanyName) {
                    const matchedEnglishName = this.findCompanyMatch(japaneseCompanyName, companyMapping);

                    if (matchedEnglishName) {
                        row[companyNameEnIndex] = matchedEnglishName;
                        updatedRows++;

                        updateLog.push({
                            row: i + 1,
                            japaneseCompanyName,
                            englishName: matchedEnglishName
                        });

                        if (updateLog.length <= 20) { // 最初の20件のみ表示
                            console.log(`✓ 行${i + 1}: ${japaneseCompanyName} → ${matchedEnglishName}`);
                        }
                    }
                }
            }
        }

        console.log(`\\n更新完了: ${updatedRows}行に英語名を追加しました`);

        if (updateLog.length > 20) {
            console.log(`(${updateLog.length - 20}件の更新は省略表示)`);
        }

        this.addedCount = updatedRows;
        this.matchingResults = updateLog;

        return {
            updatedRows,
            updateLog,
            data
        };
    }

    // 更新されたファイルを保存
    saveUpdatedFile(mainFileData, outputPath) {
        console.log(`\\n更新ファイルを保存中: ${outputPath}`);

        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(mainFileData.data);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
        XLSX.writeFile(newWorkbook, outputPath);

        console.log('保存完了');
    }

    // レポート生成
    generateReport(outputPath) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                addedEnglishNames: this.addedCount,
                totalMatches: this.matchingResults.length
            },
            matchingResults: this.matchingResults.slice(0, 100), // 最初の100件
            statistics: {
                successfulMatches: this.matchingResults.length,
                averageMatchLength: this.matchingResults.length > 0 ?
                    Math.round(this.matchingResults.reduce((sum, item) => sum + item.englishName.length, 0) / this.matchingResults.length) : 0
            },
            sampleMatches: this.matchingResults.slice(0, 10)
        };

        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\\nレポートを保存しました: ${outputPath}`);

        return report;
    }

    // メイン処理
    async processFiles(mainFilePath, additionalFilePath, outputFilePath) {
        try {
            console.log('英語名追加処理を開始...');
            console.log('='.repeat(60));

            // 1. 追加依頼ファイルを読み込み
            const companyMapping = this.loadAdditionalFile(additionalFilePath);

            if (companyMapping.size === 0) {
                console.log('追加依頼ファイルにデータが見つかりませんでした。');
                return;
            }

            // 2. メインファイルを読み込み
            const mainFileData = this.loadMainFile(mainFilePath);

            // 3. 英語名を追加
            const updateResult = this.addEnglishNames(mainFileData, companyMapping);

            // 4. 更新されたファイルを保存
            this.saveUpdatedFile(mainFileData, outputFilePath);

            // 5. レポート生成
            const report = this.generateReport('english_names_addition_report.json');

            // 6. 結果サマリー
            console.log('\\n=== 処理完了 ===');
            console.log(`追加依頼ファイル: ${companyMapping.size}社のマッピング`);
            console.log(`メインファイル: ${mainFileData.data.length - 1}行のデータ`);
            console.log(`英語名追加: ${this.addedCount}行を更新`);
            console.log(`出力ファイル: ${outputFilePath}`);

            return {
                mappingCount: companyMapping.size,
                addedCount: this.addedCount,
                outputFile: outputFilePath,
                report
            };

        } catch (error) {
            console.error('処理中にエラーが発生しました:', error.message);
            throw error;
        }
    }
}

// メイン実行
async function main() {
    const adder = new EnglishNameAdder();

    const mainFilePath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_final.xlsx';
    const additionalFilePath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\gpt追加依頼.xlsx';
    const outputFilePath = 'C:\\\\Users\\\\pumpk\\\\Downloads\\\\merged_financial_fdi_complete.xlsx';

    try {
        await adder.processFiles(mainFilePath, additionalFilePath, outputFilePath);
    } catch (error) {
        console.error('処理中にエラーが発生しました:', error.message);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = EnglishNameAdder;