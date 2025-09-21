const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createEnglishNameMapping() {
    try {
        console.log('📖 Reading Excel file...');

        // Excelファイルを読み込み
        const workbook = XLSX.readFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Found ${jsonData.length} records in Excel file`);

        // docIDと英語名のマッピングを作成
        const englishNameMapping = new Map();
        let validRecords = 0;
        let duplicates = 0;

        for (const row of jsonData) {
            const docID = row['docID'];
            const japaneseName = row['企業名'];
            const englishName = row['English__company name'];

            if (docID && englishName && englishName.trim()) {
                if (englishNameMapping.has(docID)) {
                    // 重複チェック
                    const existing = englishNameMapping.get(docID);
                    if (existing.englishName !== englishName.trim()) {
                        console.log(`⚠️  Duplicate docID with different English names:`);
                        console.log(`   ${docID}: "${existing.englishName}" vs "${englishName.trim()}"`);
                        duplicates++;
                    }
                } else {
                    englishNameMapping.set(docID, {
                        docID: docID,
                        japaneseName: japaneseName,
                        englishName: englishName.trim()
                    });
                    validRecords++;
                }
            }
        }

        console.log(`✅ Created mapping for ${validRecords} companies`);
        console.log(`⚠️  Found ${duplicates} duplicate docIDs with different English names`);

        // 現在のcompany_directory_mappingテーブルのデータを取得
        console.log('🔍 Fetching existing company_directory_mapping data...');

        const { data: existingData, error: fetchError } = await supabase
            .from('company_directory_mapping')
            .select('id, company_id, company_name, fiscal_year');

        if (fetchError) {
            throw new Error(`Failed to fetch existing data: ${fetchError.message}`);
        }

        console.log(`📋 Found ${existingData.length} existing records in company_directory_mapping`);

        // マッチングとアップデート準備
        const updateRecords = [];
        const notFoundRecords = [];

        for (const record of existingData) {
            const mapping = englishNameMapping.get(record.company_id);
            if (mapping) {
                updateRecords.push({
                    id: record.id,
                    company_id: record.company_id,
                    english_name: mapping.englishName,
                    japanese_name: record.company_name,
                    fiscal_year: record.fiscal_year
                });
            } else {
                notFoundRecords.push(record);
            }
        }

        console.log(`🎯 Matched ${updateRecords.length} records for English name updates`);
        console.log(`❓ ${notFoundRecords.length} records have no matching English names`);

        // バッチアップデート実行
        if (updateRecords.length > 0) {
            console.log('🚀 Starting batch update...');

            const batchSize = 100;
            let updatedCount = 0;
            let errorCount = 0;

            for (let i = 0; i < updateRecords.length; i += batchSize) {
                const batch = updateRecords.slice(i, i + batchSize);

                for (const record of batch) {
                    const { error } = await supabase
                        .from('company_directory_mapping')
                        .update({ english_name: record.english_name })
                        .eq('id', record.id);

                    if (error) {
                        console.error(`❌ Failed to update record ${record.id}: ${error.message}`);
                        errorCount++;
                    } else {
                        updatedCount++;
                    }
                }

                console.log(`📈 Progress: ${Math.min(i + batchSize, updateRecords.length)}/${updateRecords.length} records processed`);

                // APIレート制限対策
                if (i + batchSize < updateRecords.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log(`\n✅ Update completed!`);
            console.log(`   Successfully updated: ${updatedCount} records`);
            console.log(`   Errors: ${errorCount} records`);
        }

        // 結果レポートを生成
        const report = {
            timestamp: new Date().toISOString(),
            excel_total_records: jsonData.length,
            valid_mappings_created: validRecords,
            duplicate_docids: duplicates,
            existing_db_records: existingData.length,
            matched_for_update: updateRecords.length,
            not_found_english_names: notFoundRecords.length,
            successfully_updated: updateRecords.length - errorCount,
            update_errors: errorCount,
            sample_updates: updateRecords.slice(0, 10).map(r => ({
                company_id: r.company_id,
                japanese_name: r.japanese_name,
                english_name: r.english_name,
                fiscal_year: r.fiscal_year
            })),
            sample_not_found: notFoundRecords.slice(0, 10).map(r => ({
                company_id: r.company_id,
                company_name: r.company_name,
                fiscal_year: r.fiscal_year
            }))
        };

        // レポートを保存
        fs.writeFileSync('C:/Users/pumpk/english_name_update_report.json', JSON.stringify(report, null, 2), 'utf8');
        console.log('\n📁 Report saved to: C:/Users/pumpk/english_name_update_report.json');

        // 統計情報を表示
        console.log('\n📊 Summary Statistics:');
        console.log(`   📝 Excel records processed: ${jsonData.length}`);
        console.log(`   🎯 Valid English name mappings: ${validRecords}`);
        console.log(`   🔄 Database records updated: ${updatedCount}`);
        console.log(`   ❓ Records without English names: ${notFoundRecords.length}`);

        return report;

    } catch (error) {
        console.error(`❌ Error in createEnglishNameMapping: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
if (require.main === module) {
    createEnglishNameMapping()
        .then(result => {
            if (result) {
                console.log('\n🎉 English name mapping completed successfully!');
            } else {
                console.log('\n💥 English name mapping failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error(`💥 Unhandled error: ${error.message}`);
            process.exit(1);
        });
}