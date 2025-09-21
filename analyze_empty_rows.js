const XLSX = require('xlsx');
const fs = require('fs');

try {
    console.log('証券コードも英語名もない行を詳細分析中...');

    const workbook = XLSX.readFile('C:\\Users\\pumpk\\Downloads\\merged_financial_fdi.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0];
    const securitiesCodeIndex = 4;
    const companyNameEnIndex = 7;
    const companyNameJaIndex = 6;
    const docIDIndex = 0;
    const companyNameIndex = 1; // 企業名

    console.log('分析対象の列:');
    console.log(`docID: 列${docIDIndex + 1}`);
    console.log(`企業名: 列${companyNameIndex + 1}`);
    console.log(`証券コード: 列${securitiesCodeIndex + 1}`);
    console.log(`会社名（和名）: 列${companyNameJaIndex + 1}`);
    console.log(`英語名: 列${companyNameEnIndex + 1}`);

    const emptyRows = [];
    const companyNameFrequency = new Map();

    // 証券コードも英語名もない行を特定
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        const securitiesCode = row[securitiesCodeIndex];
        const englishName = row[companyNameEnIndex];
        const japaneseCompanyName = row[companyNameJaIndex] || row[companyNameIndex];
        const docID = row[docIDIndex];

        const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
        const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

        if (!hasSecCode && !hasEngName) {
            emptyRows.push({
                rowNumber: i + 1,
                docID,
                companyName: japaneseCompanyName
            });

            // 企業名の頻度をカウント
            if (japaneseCompanyName) {
                const count = companyNameFrequency.get(japaneseCompanyName) || 0;
                companyNameFrequency.set(japaneseCompanyName, count + 1);
            }
        }
    }

    console.log(`\n証券コードも英語名もない行数: ${emptyRows.length}`);

    // 頻出する企業名を表示
    const sortedCompanies = Array.from(companyNameFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    console.log('\n頻出する企業（証券コード・英語名なし）:');
    sortedCompanies.forEach(([name, count]) => {
        console.log(`${name}: ${count}回`);
    });

    // サンプルデータを表示
    console.log('\nサンプルデータ（最初の10件）:');
    emptyRows.slice(0, 10).forEach(row => {
        console.log(`行${row.rowNumber}: ${row.docID} - ${row.companyName}`);
    });

    // これらの企業が上場企業かどうかを判断するため、企業名からパターンを分析
    const corporateTypes = new Map();
    emptyRows.forEach(row => {
        if (row.companyName) {
            // 企業の種類を分析
            let type = 'その他';
            if (row.companyName.includes('株式会社')) type = '株式会社';
            else if (row.companyName.includes('有限会社')) type = '有限会社';
            else if (row.companyName.includes('合同会社')) type = '合同会社';
            else if (row.companyName.includes('合資会社')) type = '合資会社';
            else if (row.companyName.includes('合名会社')) type = '合名会社';
            else if (row.companyName.includes('財団法人')) type = '財団法人';
            else if (row.companyName.includes('社団法人')) type = '社団法人';
            else if (row.companyName.includes('学校法人')) type = '学校法人';
            else if (row.companyName.includes('医療法人')) type = '医療法人';
            else if (row.companyName.includes('宗教法人')) type = '宗教法人';

            const count = corporateTypes.get(type) || 0;
            corporateTypes.set(type, count + 1);
        }
    });

    console.log('\n企業形態別分布:');
    Array.from(corporateTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`${type}: ${count}件 (${(count/emptyRows.length*100).toFixed(1)}%)`);
        });

    // 非上場企業の可能性が高い企業名のパターンを特定
    const likelyUnlistedPatterns = [
        '有限会社', '合同会社', '合資会社', '合名会社',
        '財団法人', '社団法人', '学校法人', '医療法人', '宗教法人',
        '組合', '協会', '連盟', '機構'
    ];

    const likelyUnlisted = emptyRows.filter(row => {
        if (!row.companyName) return false;
        return likelyUnlistedPatterns.some(pattern => row.companyName.includes(pattern));
    });

    const potentiallyListed = emptyRows.filter(row => {
        if (!row.companyName) return false;
        return !likelyUnlistedPatterns.some(pattern => row.companyName.includes(pattern));
    });

    console.log(`\n非上場と思われる企業: ${likelyUnlisted.length}件`);
    console.log(`上場企業の可能性がある企業: ${potentiallyListed.length}件`);

    // 上場企業の可能性がある企業のリストを作成
    const potentialListedCompanies = new Map();
    potentiallyListed.forEach(row => {
        if (row.companyName) {
            if (!potentialListedCompanies.has(row.companyName)) {
                potentialListedCompanies.set(row.companyName, []);
            }
            potentialListedCompanies.get(row.companyName).push(row.docID);
        }
    });

    console.log('\n調査が必要な企業（最初の20社）:');
    let count = 0;
    for (const [companyName, docIDs] of potentialListedCompanies.entries()) {
        if (count >= 20) break;
        console.log(`${companyName} (${docIDs.length}件)`);
        count++;
    }

    // 結果をファイルに保存
    const result = {
        summary: {
            totalEmptyRows: emptyRows.length,
            likelyUnlisted: likelyUnlisted.length,
            potentiallyListed: potentiallyListed.length,
            uniqueCompanies: potentialListedCompanies.size
        },
        companyFrequency: Object.fromEntries(sortedCompanies),
        corporateTypes: Object.fromEntries(corporateTypes),
        potentialListedCompanies: Object.fromEntries(
            Array.from(potentialListedCompanies.entries()).slice(0, 100)
        )
    };

    fs.writeFileSync('empty_rows_analysis.json', JSON.stringify(result, null, 2), 'utf8');
    console.log('\n分析結果をempty_rows_analysis.jsonに保存しました。');

} catch (error) {
    console.error('エラー:', error.message);
}