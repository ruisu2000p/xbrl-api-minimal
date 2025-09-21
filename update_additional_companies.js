const XLSX = require('xlsx');
const fs = require('fs');

// 追加で調査した企業情報（上場廃止企業も含む、履歴として重要）
const additionalCompaniesInfo = {
    // 上場廃止企業（過去の上場企業として記録）
    '桃太郎源株式会社': {
        securitiesCode: 3052,
        englishName: 'Momotaro-Gene Inc.',
        note: '上場廃止（バイオテクノロジー企業）'
    },
    '株式会社フジコー': {
        securitiesCode: 2405,
        englishName: 'FUJIKOH CO.,LTD.',
        note: '2020年3月上場廃止'
    },
    '株式会社オリバー': {
        securitiesCode: 7959,
        englishName: 'OLIVER CORPORATION',
        note: '2022年上場廃止（ネクスト・オーに合併）'
    },
    '株式会社シベール': {
        securitiesCode: 2228,
        englishName: 'CYBELE CO.,LTD.',
        note: '2019年上場廃止（民事再生）'
    },

    // 現在上場中の企業（さらなる調査が必要）
    '株式会社明光ネットワークジャパン': {
        securitiesCode: 4668,
        englishName: 'MEIKO NETWORK JAPAN CO.,LTD.'
    },
    '株式会社ファーマフーズ': {
        securitiesCode: 2929,
        englishName: 'Pharma Foods International Co.,Ltd.'
    },
    'ヤマトインターナショナル株式会社': {
        securitiesCode: 8127,
        englishName: 'YAMATO INTERNATIONAL INC.'
    },
    '神島化学工業株式会社': {
        securitiesCode: 4026,
        englishName: 'Konoshima Chemical Co.,Ltd.'
    },
    '株式会社キタック': {
        securitiesCode: 4707,
        englishName: 'KITAC CORPORATION'
    },
    '株式会社キングジム': {
        securitiesCode: 7962,
        englishName: 'KING JIM CO.,LTD.'
    },

    // 非上場企業（情報として記録）
    '株式会社神戸新聞社': {
        securitiesCode: null,
        englishName: 'Kobe Shimbun Corporation',
        note: '非上場（新聞社）'
    }
};

// 既存の企業情報（前回追加分）
const existingCompaniesInfo = {
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
    },
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

// すべての企業情報を統合
const allCompaniesInfo = { ...existingCompaniesInfo, ...additionalCompaniesInfo };

try {
    console.log('追加企業情報でExcelファイルを更新中...');

    // 更新されたファイルを読み込み
    const inputPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi_updated.xlsx';
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

    let newUpdatedCount = 0;
    let newMatchedCompanies = [];

    // データを更新（追加の企業情報のみ）
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        const securitiesCode = row[securitiesCodeIndex];
        const englishName = row[companyNameEnIndex];
        const japaneseCompanyName = row[companyNameJaIndex] || row[companyNameIndex];

        // 証券コードまたは英語名が空の場合のみ処理
        const hasSecCode = securitiesCode !== undefined && securitiesCode !== null && securitiesCode !== '';
        const hasEngName = englishName !== undefined && englishName !== null && englishName !== '';

        if (!hasSecCode || !hasEngName) {
            // 企業名でマッチング（新しい企業情報のみ）
            const companyKey = Object.keys(additionalCompaniesInfo).find(key => {
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
                const info = additionalCompaniesInfo[companyKey];
                let updated = false;

                // 証券コードを更新（非上場企業の場合はnullなので更新しない）
                if (!hasSecCode && info.securitiesCode !== null) {
                    row[securitiesCodeIndex] = info.securitiesCode;
                    updated = true;
                }

                // 英語名を更新
                if (!hasEngName) {
                    row[companyNameEnIndex] = info.englishName;
                    updated = true;
                }

                if (updated) {
                    newUpdatedCount++;
                    newMatchedCompanies.push({
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

    console.log(`\\n追加更新完了: ${newUpdatedCount}行を新たに更新しました`);

    if (newMatchedCompanies.length > 0) {
        console.log('\\n新たに更新された企業:');
        newMatchedCompanies.forEach(company => {
            console.log(`行${company.row}: ${company.company}`);
            if (company.securitiesCode) {
                console.log(`  証券コード: ${company.securitiesCode}`);
            }
            console.log(`  英語名: ${company.englishName}`);
            if (company.note) console.log(`  備考: ${company.note}`);
            console.log('');
        });
    }

    // 更新されたデータを新しいExcelファイルとして保存
    const outputPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi_final.xlsx';
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    XLSX.writeFile(newWorkbook, outputPath);

    console.log(`最終更新ファイルを保存しました: ${outputPath}`);

    // 最終更新レポートを作成
    const finalReport = {
        summary: {
            totalRows: jsonData.length - 1,
            newUpdatedRows: newUpdatedCount,
            timestamp: new Date().toISOString()
        },
        newlyUpdatedCompanies: newMatchedCompanies,
        allAvailableCompaniesInfo: Object.keys(allCompaniesInfo).map(key => ({
            name: key,
            securitiesCode: allCompaniesInfo[key].securitiesCode,
            englishName: allCompaniesInfo[key].englishName,
            note: allCompaniesInfo[key].note || '',
            category: existingCompaniesInfo[key] ? 'existing' : 'new'
        }))
    };

    fs.writeFileSync('final_update_report.json', JSON.stringify(finalReport, null, 2), 'utf8');
    console.log('最終更新レポートをfinal_update_report.jsonに保存しました。');

    // 統計情報を表示
    const totalUpdated = newUpdatedCount;
    const listedCompanies = Object.values(allCompaniesInfo).filter(info => info.securitiesCode !== null).length;
    const delistedCompanies = Object.values(allCompaniesInfo).filter(info => info.note && info.note.includes('上場廃止')).length;
    const privateCompanies = Object.values(allCompaniesInfo).filter(info => info.securitiesCode === null).length;

    console.log('\\n=== 統計情報 ===');
    console.log(`今回新たに更新された行数: ${totalUpdated}`);
    console.log(`データベース内企業数: ${Object.keys(allCompaniesInfo).length}`);
    console.log(`  - 現在上場企業: ${listedCompanies - delistedCompanies}`);
    console.log(`  - 上場廃止企業: ${delistedCompanies}`);
    console.log(`  - 非上場企業: ${privateCompanies}`);

} catch (error) {
    console.error('エラー:', error.message);
}