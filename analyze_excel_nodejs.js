const fs = require('fs');
const XLSX = require('xlsx');

async function analyzeExcelFile(filePath) {
    try {
        console.log(`📖 Reading Excel file: ${filePath}`);

        // Excelファイルを読み込み
        const workbook = XLSX.readFile(filePath);

        console.log(`🔍 Found ${workbook.SheetNames.length} sheets:`);
        workbook.SheetNames.forEach((name, index) => {
            console.log(`  ${index + 1}. ${name}`);
        });

        // 最初のシートを取得
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // JSONに変換
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            console.log('❌ No data found in the Excel file');
            return null;
        }

        // ヘッダー行を取得
        const headers = jsonData[0];
        console.log(`📋 Headers: ${headers.join(', ')}`);

        // データ行を取得（最初の5行）
        console.log(`📊 Data shape: ${jsonData.length - 1} rows, ${headers.length} columns`);
        console.log(`📄 First 5 data rows:`);

        for (let i = 1; i <= Math.min(6, jsonData.length - 1); i++) {
            const row = jsonData[i];
            const rowObj = {};
            headers.forEach((header, index) => {
                rowObj[header] = row[index];
            });
            console.log(`  Row ${i}:`, JSON.stringify(rowObj, null, 2));
        }

        // 英語名と日本語名、docIDの列を特定
        const potentialColumns = {
            docId: [],
            japaneseName: [],
            englishName: [],
            other: []
        };

        headers.forEach((header, index) => {
            const headerLower = String(header).toLowerCase();

            if (headerLower.includes('docid') || headerLower.includes('doc_id') || headerLower.includes('id')) {
                potentialColumns.docId.push({ name: header, index });
            } else if (headerLower.includes('english') || headerLower.includes('en_name') || headerLower.includes('eng')) {
                potentialColumns.englishName.push({ name: header, index });
            } else if (headerLower.includes('企業名') || headerLower.includes('company') || headerLower.includes('名前')) {
                if (!headerLower.includes('english') && !headerLower.includes('eng')) {
                    potentialColumns.japaneseName.push({ name: header, index });
                }
            } else {
                potentialColumns.other.push({ name: header, index });
            }
        });

        console.log('\n🏷️ Column analysis:');
        console.log('  DocID columns:', potentialColumns.docId.map(c => c.name));
        console.log('  Japanese name columns:', potentialColumns.japaneseName.map(c => c.name));
        console.log('  English name columns:', potentialColumns.englishName.map(c => c.name));
        console.log('  Other columns:', potentialColumns.other.map(c => c.name));

        // S100で始まるIDのサンプルを検索
        const s100Samples = [];
        for (let i = 1; i < Math.min(101, jsonData.length); i++) {
            const row = jsonData[i];
            for (let j = 0; j < row.length; j++) {
                const cellValue = String(row[j] || '');
                if (cellValue.startsWith('S100')) {
                    s100Samples.push({
                        row: i,
                        column: headers[j],
                        value: cellValue
                    });
                }
            }
        }

        console.log('\n🎯 Found S100* company IDs:');
        s100Samples.slice(0, 10).forEach(sample => {
            console.log(`  ${sample.value} (Row ${sample.row}, Column: ${sample.column})`);
        });

        // 結果を保存
        const result = {
            sheets: workbook.SheetNames,
            headers: headers,
            dataRowCount: jsonData.length - 1,
            potentialColumns: potentialColumns,
            s100Samples: s100Samples.slice(0, 20),
            sampleData: jsonData.slice(1, 6).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            })
        };

        // 結果をJSONファイルに保存
        fs.writeFileSync('C:/Users/pumpk/excel_analysis_result.json', JSON.stringify(result, null, 2), 'utf8');
        console.log('\n✅ Analysis complete! Results saved to: C:/Users/pumpk/excel_analysis_result.json');

        return result;

    } catch (error) {
        console.error(`❌ Error analyzing Excel file: ${error.message}`);
        return null;
    }
}

// 実行
analyzeExcelFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');