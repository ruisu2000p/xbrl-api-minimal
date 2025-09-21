const XLSX = require('xlsx');
const fs = require('fs');

try {
    console.log('Excelファイルを読み込み中...');

    // Excelファイルを読み込み
    const workbook = XLSX.readFile('C:\\Users\\pumpk\\Downloads\\merged_financial_fdi.xlsx');

    // シート名を取得
    const sheetNames = workbook.SheetNames;
    console.log('シート名:', sheetNames);

    // 最初のシートを選択
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // データをJSONに変換
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('\n基本情報:');
    console.log('行数:', jsonData.length);
    console.log('列数:', jsonData.length > 0 ? jsonData[0].length : 0);

    if (jsonData.length > 0) {
        console.log('\nヘッダー行:');
        jsonData[0].forEach((header, index) => {
            console.log(`${index + 1}. ${header || 'empty'}`);
        });

        console.log('\n最初の5行のデータ:');
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            console.log(`行 ${i + 1}:`, jsonData[i].slice(0, 10)); // 最初の10列のみ表示
        }

        // 証券コードに関連する列を探す
        console.log('\n証券コードや英語名に関連する列を探索中...');
        const headerRow = jsonData[0];
        const relevantColumns = [];

        headerRow.forEach((header, index) => {
            if (header && typeof header === 'string') {
                const headerLower = header.toLowerCase();
                if (headerLower.includes('code') ||
                    headerLower.includes('証券') ||
                    headerLower.includes('securities') ||
                    headerLower.includes('symbol') ||
                    headerLower.includes('english') ||
                    headerLower.includes('英語') ||
                    headerLower.includes('name') ||
                    headerLower.includes('会社') ||
                    headerLower.includes('company')) {
                    relevantColumns.push({ index, header });
                }
            }
        });

        console.log('関連する列:');
        relevantColumns.forEach(col => {
            console.log(`列 ${col.index + 1}: ${col.header}`);
        });

        // データの一部をサンプル表示
        if (relevantColumns.length > 0) {
            console.log('\n関連列のサンプルデータ:');
            for (let i = 1; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                const sampleData = {};
                relevantColumns.forEach(col => {
                    sampleData[col.header] = row[col.index];
                });
                console.log(`行 ${i + 1}:`, sampleData);
            }
        }
    }

} catch (error) {
    console.error('エラー:', error.message);
}