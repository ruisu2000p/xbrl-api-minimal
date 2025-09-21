const XLSX = require('xlsx');
const fs = require('fs');

try {
    console.log('最終完成度を分析中...');

    // 最終更新されたファイルを読み込み
    const inputPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi_final.xlsx';
    const workbook = XLSX.readFile(inputPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`総行数: ${jsonData.length}`);

    // ヘッダー行のインデックス
    const headers = jsonData[0];
    const securitiesCodeIndex = 4; // 証券コード
    const companyNameEnIndex = 7; // 英語名
    const companyNameJaIndex = 6; // 会社名（和名）
    const companyNameIndex = 1; // 企業名

    // 統計情報を収集
    let totalRows = 0;
    let hasSecuritiesCode = 0;
    let hasEnglishName = 0;
    let hasBoth = 0;
    let hasSecuritiesCodeButNoEnglishName = 0;
    let hasEnglishNameButNoSecuritiesCode = 0;
    let hasNeither = 0;

    const remainingCompanies = [];
    const completedCompanies = [];

    // データをスキャン
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        totalRows++;

        const securitiesCode = row[securitiesCodeIndex];
        const englishName = row[companyNameEnIndex];
        const japaneseCompanyName = row[companyNameJaIndex] || row[companyNameIndex];
        const docID = row[0];

        const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
        const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

        if (hasSecCode) hasSecuritiesCode++;
        if (hasEngName) hasEnglishName++;

        if (hasSecCode && hasEngName) {
            hasBoth++;
            completedCompanies.push({
                docID,
                company: japaneseCompanyName,
                securitiesCode,
                englishName
            });
        } else if (hasSecCode && !hasEngName) {
            hasSecuritiesCodeButNoEnglishName++;
        } else if (!hasSecCode && hasEngName) {
            hasEnglishNameButNoSecuritiesCode++;
        } else {
            hasNeither++;
            if (japaneseCompanyName) {
                remainingCompanies.push({
                    docID,
                    company: japaneseCompanyName
                });
            }
        }
    }

    console.log('\\n=== 最終統計情報 ===');
    console.log(`総データ行数: ${totalRows.toLocaleString()}`);
    console.log(`証券コードがある行: ${hasSecuritiesCode.toLocaleString()} (${(hasSecuritiesCode/totalRows*100).toFixed(1)}%)`);
    console.log(`英語名がある行: ${hasEnglishName.toLocaleString()} (${(hasEnglishName/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードと英語名の両方がある行: ${hasBoth.toLocaleString()} (${(hasBoth/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードはあるが英語名がない行: ${hasSecuritiesCodeButNoEnglishName.toLocaleString()} (${(hasSecuritiesCodeButNoEnglishName/totalRows*100).toFixed(1)}%)`);
    console.log(`英語名はあるが証券コードがない行: ${hasEnglishNameButNoSecuritiesCode.toLocaleString()} (${(hasEnglishNameButNoSecuritiesCode/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードも英語名もない行: ${hasNeither.toLocaleString()} (${(hasNeither/totalRows*100).toFixed(1)}%)`);

    // 不足している企業名の頻度分析
    const companyFrequency = new Map();
    remainingCompanies.forEach(item => {
        if (item.company) {
            const count = companyFrequency.get(item.company) || 0;
            companyFrequency.set(item.company, count + 1);
        }
    });

    const sortedRemainingCompanies = Array.from(companyFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30); // 上位30社

    console.log('\\n=== 未完成の企業（上位30社） ===');
    console.log('以下の企業はまだ証券コードと英語名が不足しています:');
    sortedRemainingCompanies.forEach(([name, count], index) => {
        console.log(`${index + 1}. ${name}: ${count}回`);
    });

    // 完成率計算
    const completionRate = (hasBoth / totalRows * 100).toFixed(2);
    console.log(`\\n=== 完成率 ===`);
    console.log(`データ完成率: ${completionRate}%`);
    console.log(`完成済み: ${hasBoth.toLocaleString()}行`);
    console.log(`未完成: ${(totalRows - hasBoth).toLocaleString()}行`);

    // 改善提案
    console.log('\\n=== 改善提案 ===');
    if (parseFloat(completionRate) < 80) {
        console.log('1. Yahoo Finance APIやEDINET APIを活用して証券コードを自動取得');
        console.log('2. 企業名の正規化（株式会社の除去、スペース統一）でマッチング精度向上');
        console.log('3. 業界別データベースとのクロスマッチング');
        console.log('4. 上場廃止企業データベースとの照合');
    }

    if (hasSecuritiesCodeButNoEnglishName > 0) {
        console.log(`5. 証券コードから英語名を取得: ${hasSecuritiesCodeButNoEnglishName}件`);
    }

    // 次のステップの優先順位
    console.log('\\n=== 次のステップ優先順位 ===');
    console.log('1. 頻出上位10社の手動調査');
    console.log('2. 証券コードから英語名の逆引き');
    console.log('3. Yahoo Finance APIによる自動取得');
    console.log('4. 企業名正規化によるマッチング改善');

    // レポートを保存
    const finalReport = {
        summary: {
            totalRows,
            completionRate: parseFloat(completionRate),
            hasSecuritiesCode,
            hasEnglishName,
            hasBoth,
            hasNeither,
            timestamp: new Date().toISOString()
        },
        topUncompletedCompanies: sortedRemainingCompanies.slice(0, 50),
        improvementSuggestions: [
            'Yahoo Finance APIの活用',
            '企業名正規化',
            '業界別データベース照合',
            '上場廃止企業データベース照合'
        ],
        nextSteps: [
            '頻出上位企業の手動調査',
            '証券コードから英語名の逆引き',
            'API自動取得システム構築',
            'マッチングアルゴリズム改善'
        ]
    };

    fs.writeFileSync('final_completion_report.json', JSON.stringify(finalReport, null, 2), 'utf8');
    console.log('\\n最終完成度レポートをfinal_completion_report.jsonに保存しました。');

} catch (error) {
    console.error('エラー:', error.message);
}