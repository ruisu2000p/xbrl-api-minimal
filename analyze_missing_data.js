const XLSX = require('xlsx');
const fs = require('fs');

try {
    console.log('欠損データを分析中...');

    // Excelファイルを読み込み
    const workbook = XLSX.readFile('C:\\Users\\pumpk\\Downloads\\merged_financial_fdi.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`総行数: ${jsonData.length}`);

    // ヘッダー行のインデックスを取得
    const headers = jsonData[0];
    const securitiesCodeIndex = 4; // 証券コード
    const isinCodeIndex = 5; // ISINコード
    const companyNameJaIndex = 6; // 会社名（和名）
    const companyNameEnIndex = 7; // Issue name /company name

    console.log('列のマッピング:');
    console.log(`証券コード: 列${securitiesCodeIndex + 1} (${headers[securitiesCodeIndex]})`);
    console.log(`ISINコード: 列${isinCodeIndex + 1} (${headers[isinCodeIndex]})`);
    console.log(`会社名（和名）: 列${companyNameJaIndex + 1} (${headers[companyNameJaIndex]})`);
    console.log(`英語名: 列${companyNameEnIndex + 1} (${headers[companyNameEnIndex]})`);

    // 統計情報を収集
    let totalRows = 0;
    let hasSecuritiesCode = 0;
    let hasEnglishName = 0;
    let hasSecuritiesCodeButNoEnglishName = 0;
    let hasEnglishNameButNoSecuritiesCode = 0;
    let hasBoth = 0;
    let hasNeither = 0;

    const securitiesCodeList = new Set();
    const missingEnglishNameData = [];
    const availableEnglishNameData = [];

    // データをスキャン
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        totalRows++;

        const securitiesCode = row[securitiesCodeIndex];
        const englishName = row[companyNameEnIndex];
        const japaneseCompanyName = row[companyNameJaIndex];
        const docID = row[0];

        const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
        const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

        if (hasSecCode) {
            hasSecuritiesCode++;
            securitiesCodeList.add(securitiesCode.toString());
        }
        if (hasEngName) hasEnglishName++;

        if (hasSecCode && hasEngName) {
            hasBoth++;
            availableEnglishNameData.push({
                docID,
                securitiesCode,
                englishName,
                japaneseCompanyName
            });
        } else if (hasSecCode && !hasEngName) {
            hasSecuritiesCodeButNoEnglishName++;
            missingEnglishNameData.push({
                docID,
                securitiesCode,
                japaneseCompanyName
            });
        } else if (!hasSecCode && hasEngName) {
            hasEnglishNameButNoSecuritiesCode++;
        } else {
            hasNeither++;
        }
    }

    console.log('\n=== 統計情報 ===');
    console.log(`総データ行数: ${totalRows}`);
    console.log(`証券コードがある行: ${hasSecuritiesCode} (${(hasSecuritiesCode/totalRows*100).toFixed(1)}%)`);
    console.log(`英語名がある行: ${hasEnglishName} (${(hasEnglishName/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードと英語名の両方がある行: ${hasBoth} (${(hasBoth/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードはあるが英語名がない行: ${hasSecuritiesCodeButNoEnglishName} (${(hasSecuritiesCodeButNoEnglishName/totalRows*100).toFixed(1)}%)`);
    console.log(`英語名はあるが証券コードがない行: ${hasEnglishNameButNoSecuritiesCode} (${(hasEnglishNameButNoSecuritiesCode/totalRows*100).toFixed(1)}%)`);
    console.log(`証券コードも英語名もない行: ${hasNeither} (${(hasNeither/totalRows*100).toFixed(1)}%)`);

    console.log(`\n一意の証券コード数: ${securitiesCodeList.size}`);

    // 証券コード別に整理
    const securitiesCodeMap = new Map();

    availableEnglishNameData.forEach(item => {
        const code = item.securitiesCode.toString();
        if (!securitiesCodeMap.has(code)) {
            securitiesCodeMap.set(code, {
                securitiesCode: code,
                englishNames: new Set(),
                japaneseNames: new Set()
            });
        }
        securitiesCodeMap.get(code).englishNames.add(item.englishName);
        securitiesCodeMap.get(code).japaneseNames.add(item.japaneseCompanyName);
    });

    // 欠損している証券コードのリストを作成
    const missingSecuritiesCodes = new Set();
    missingEnglishNameData.forEach(item => {
        missingSecuritiesCodes.add(item.securitiesCode.toString());
    });

    // 既存データで補完可能な証券コードを特定
    const canBeFilledFromExisting = [];
    const needWebLookup = [];

    missingSecuritiesCodes.forEach(code => {
        if (securitiesCodeMap.has(code)) {
            const data = securitiesCodeMap.get(code);
            canBeFilledFromExisting.push({
                securitiesCode: code,
                englishNames: Array.from(data.englishNames),
                japaneseNames: Array.from(data.japaneseNames)
            });
        } else {
            needWebLookup.push(code);
        }
    });

    console.log('\n=== 補完可能性分析 ===');
    console.log(`既存データから補完可能な証券コード: ${canBeFilledFromExisting.length}`);
    console.log(`Webで調査が必要な証券コード: ${needWebLookup.length}`);

    // 既存データから補完可能な証券コードを表示
    if (canBeFilledFromExisting.length > 0) {
        console.log('\n既存データから補完可能な証券コード（一部表示）:');
        canBeFilledFromExisting.slice(0, 10).forEach(item => {
            console.log(`${item.securitiesCode}: ${item.englishNames[0]} (${item.japaneseNames[0]})`);
        });
    }

    // Web調査が必要な証券コードを表示
    if (needWebLookup.length > 0) {
        console.log('\nWeb調査が必要な証券コード（最初の20個）:');
        needWebLookup.slice(0, 20).forEach(code => {
            console.log(code);
        });
    }

    // データをファイルに保存
    const analysis = {
        summary: {
            totalRows,
            hasSecuritiesCode,
            hasEnglishName,
            hasBoth,
            hasSecuritiesCodeButNoEnglishName,
            uniqueSecuritiesCodes: securitiesCodeList.size
        },
        canBeFilledFromExisting,
        needWebLookup,
        missingEnglishNameData: missingEnglishNameData.slice(0, 100) // 最初の100件のみ
    };

    fs.writeFileSync('missing_data_analysis.json', JSON.stringify(analysis, null, 2), 'utf8');
    console.log('\n分析結果をmissing_data_analysis.jsonに保存しました。');

} catch (error) {
    console.error('エラー:', error.message);
}