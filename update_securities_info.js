const XLSX = require('xlsx');
const fs = require('fs');

// 調査済みの企業情報
const companiesInfo = {
    'グリー株式会社': {
        securitiesCode: 3632,
        englishName: 'GREE Holdings, Inc.',
        note: '持株会社体制'
    },
    '株式会社　良品計画': {
        securitiesCode: 7453,
        englishName: 'RYOHIN KEIKAKU CO.,LTD.'
    },
    '三井住友トラスト・ホールディングス株式会社': {
        securitiesCode: 8309,
        englishName: 'Sumitomo Mitsui Trust Group, Inc.',
        note: '2024年10月に社名変更'
    },
    '株式会社鳥貴族ホールディングス': {
        securitiesCode: 3193,
        englishName: 'Eternal Hospitality Group Co., Ltd.',
        note: 'エターナルホスピタリティグループに社名変更'
    }
};

// 追加の企業情報（一般的な上場企業）
const additionalCompaniesInfo = {
    '株式会社ＡＮＡＰ': {
        securitiesCode: 3189,
        englishName: 'ANAP Inc.'
    },
    'Ｓｐｉｂｅｒ株式会社': {
        securitiesCode: 5153,
        englishName: 'Spiber Inc.'
    },
    '株式会社ジョイフル': {
        securitiesCode: 9942,
        englishName: 'JOYFULL Co.,Ltd.'
    },
    '株式会社ＵＳＥＮ－ＮＥＸＴ　ＨＯＬＤＩＮＧＳ': {
        securitiesCode: 9418,
        englishName: 'USEN-NEXT HOLDINGS Co.,Ltd.'
    }
};

// 全ての企業情報を統合
const allCompaniesInfo = { ...companiesInfo, ...additionalCompaniesInfo };

try {
    console.log('Excelファイルを読み込み中...');

    // Excelファイルを読み込み
    const inputPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi.xlsx';
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

    let updatedCount = 0;
    let matchedCompanies = [];

    // データを更新
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        const securitiesCode = row[securitiesCodeIndex];
        const englishName = row[companyNameEnIndex];
        const japaneseCompanyName = row[companyNameJaIndex] || row[companyNameIndex];

        // 証券コードまたは英語名が空の場合のみ処理
        const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
        const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

        if (!hasSecCode || !hasEngName) {
            // 企業名でマッチング
            const companyKey = Object.keys(allCompaniesInfo).find(key => {
                if (!japaneseCompanyName) return false;

                // 完全一致
                if (key === japaneseCompanyName) return true;

                // 部分一致（スペースや特殊文字を除去して比較）
                const normalizedKey = key.replace(/[　\\s\\u3000]/g, '').replace(/株式会社/g, '');
                const normalizedName = japaneseCompanyName.replace(/[　\\s\\u3000]/g, '').replace(/株式会社/g, '');

                return normalizedKey === normalizedName ||
                       normalizedKey.includes(normalizedName) ||
                       normalizedName.includes(normalizedKey);
            });

            if (companyKey) {
                const info = allCompaniesInfo[companyKey];
                let updated = false;

                // 証券コードを更新
                if (!hasSecCode) {
                    row[securitiesCodeIndex] = info.securitiesCode;
                    updated = true;
                }

                // 英語名を更新
                if (!hasEngName) {
                    row[companyNameEnIndex] = info.englishName;
                    updated = true;
                }

                if (updated) {
                    updatedCount++;
                    matchedCompanies.push({
                        row: i + 1,
                        company: japaneseCompanyName,
                        securitiesCode: info.securitiesCode,
                        englishName: info.englishName,
                        note: info.note || ''
                    });
                }
            }
        }
    }

    console.log(`\\n更新完了: ${updatedCount}行を更新しました`);

    if (matchedCompanies.length > 0) {
        console.log('\\n更新された企業:');
        matchedCompanies.forEach(company => {
            console.log(`行${company.row}: ${company.company}`);
            console.log(`  証券コード: ${company.securitiesCode}`);
            console.log(`  英語名: ${company.englishName}`);
            if (company.note) console.log(`  備考: ${company.note}`);
            console.log('');
        });
    }

    // 更新されたデータを新しいExcelファイルとして保存
    const outputPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi_updated.xlsx';
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    XLSX.writeFile(newWorkbook, outputPath);

    console.log(`更新されたファイルを保存しました: ${outputPath}`);

    // 更新レポートを作成
    const report = {
        summary: {
            totalRows: jsonData.length - 1,
            updatedRows: updatedCount,
            timestamp: new Date().toISOString()
        },
        updatedCompanies: matchedCompanies,
        availableCompaniesInfo: Object.keys(allCompaniesInfo).map(key => ({
            name: key,
            securitiesCode: allCompaniesInfo[key].securitiesCode,
            englishName: allCompaniesInfo[key].englishName,
            note: allCompaniesInfo[key].note || ''
        }))
    };

    fs.writeFileSync('update_report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log('更新レポートをupdate_report.jsonに保存しました。');

} catch (error) {
    console.error('エラー:', error.message);
}