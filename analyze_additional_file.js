const XLSX = require('xlsx');

try {
    console.log('追加依頼ファイルの詳細分析...');

    const workbook = XLSX.readFile('C:\\Users\\pumpk\\Downloads\\gpt追加依頼.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`総行数: ${jsonData.length}`);
    console.log('\\nヘッダー行:');
    const headers = jsonData[0];
    headers.forEach((header, index) => {
        console.log(`${index + 1}. ${header || 'empty'}`);
    });

    console.log('\\n最初の10行のサンプルデータ:');
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        console.log(`行 ${i + 1}:`, jsonData[i]);
    }

    // 各列の非空データを確認
    console.log('\\n各列の非空データ数:');
    const columnStats = {};
    headers.forEach((header, index) => {
        let nonEmptyCount = 0;
        for (let i = 1; i < jsonData.length; i++) {
            const value = jsonData[i][index];
            if (value !== undefined && value !== null && value !== '') {
                nonEmptyCount++;
            }
        }
        columnStats[`列${index + 1} (${header || 'unnamed'})`] = nonEmptyCount;
        console.log(`列${index + 1} (${header || 'unnamed'}): ${nonEmptyCount}件`);
    });

    // 英語名らしき列を特定
    console.log('\\n英語名らしき列の検索:');
    headers.forEach((header, index) => {
        if (header && typeof header === 'string') {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('english') ||
                headerLower.includes('company name') ||
                headerLower.includes('issue name') ||
                header.includes('英語') ||
                header.includes('英文')) {

                console.log(`★ 列${index + 1}: ${header} (英語名候補)`);

                // サンプルデータを表示
                console.log('  サンプルデータ:');
                for (let i = 1; i < Math.min(6, jsonData.length); i++) {
                    const value = jsonData[i][index];
                    if (value) {
                        console.log(`    行${i + 1}: ${value}`);
                    }
                }
            }
        }
    });

    // 企業名らしき列を特定
    console.log('\\n企業名らしき列の検索:');
    headers.forEach((header, index) => {
        if (header && typeof header === 'string') {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('企業') ||
                headerLower.includes('会社') ||
                headerLower.includes('company') ||
                header.includes('名')) {

                console.log(`★ 列${index + 1}: ${header} (企業名候補)`);

                // サンプルデータを表示
                console.log('  サンプルデータ:');
                for (let i = 1; i < Math.min(6, jsonData.length); i++) {
                    const value = jsonData[i][index];
                    if (value) {
                        console.log(`    行${i + 1}: ${value}`);
                    }
                }
            }
        }
    });

} catch (error) {
    console.error('エラー:', error.message);
}