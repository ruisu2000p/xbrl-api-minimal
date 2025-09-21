const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定（直接指定）
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL(query, description) {
    try {
        console.log(`🔄 Executing: ${description}`);
        const { data, error } = await supabase.rpc('execute_sql', { query });

        if (error) {
            console.error(`❌ SQL Error: ${error.message}`);
            return false;
        }

        console.log(`✅ Success: ${description}`);
        return true;
    } catch (error) {
        console.error(`❌ Exception: ${error.message}`);
        return false;
    }
}

async function createEnglishNameMapping() {
    try {
        console.log('🚀 Starting English name mapping process...');

        // Step 1: テーブル拡張
        console.log('\n📋 Step 1: Extending database table...');

        const tableExtensions = [
            {
                sql: `ALTER TABLE public.company_directory_mapping ADD COLUMN IF NOT EXISTS english_name TEXT;`,
                description: 'Adding english_name column'
            },
            {
                sql: `ALTER TABLE public.company_directory_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
                description: 'Adding updated_at column'
            },
            {
                sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
                description: 'Enabling pg_trgm extension'
            },
            {
                sql: `CREATE INDEX IF NOT EXISTS idx_company_directory_english_name ON public.company_directory_mapping USING gin(english_name gin_trgm_ops);`,
                description: 'Creating English name search index'
            }
        ];

        for (const extension of tableExtensions) {
            const success = await executeSQL(extension.sql, extension.description);
            if (!success) {
                console.log('⚠️ Continuing despite SQL error...');
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Step 2: Excelファイル読み込み
        console.log('\n📖 Step 2: Reading Excel file...');

        const workbook = XLSX.readFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Found ${jsonData.length} records in Excel file`);

        // Step 3: 英語名マッピング作成
        console.log('\n🎯 Step 3: Creating English name mapping...');

        const englishNameMapping = new Map();
        let validRecords = 0;

        for (const row of jsonData) {
            const docID = row['docID'];
            const englishName = row['English__company name'];

            if (docID && englishName && englishName.trim()) {
                if (!englishNameMapping.has(docID)) {
                    englishNameMapping.set(docID, englishName.trim());
                    validRecords++;
                }
            }
        }

        console.log(`✅ Created mapping for ${validRecords} unique companies`);

        // Step 4: 既存データの取得
        console.log('\n🔍 Step 4: Fetching existing database records...');

        const { data: existingData, error: fetchError } = await supabase
            .from('company_directory_mapping')
            .select('id, company_id, company_name, fiscal_year');

        if (fetchError) {
            throw new Error(`Failed to fetch existing data: ${fetchError.message}`);
        }

        console.log(`📋 Found ${existingData.length} existing records in database`);

        // Step 5: マッチングとアップデート
        console.log('\n🔄 Step 5: Matching and updating records...');

        const updatePromises = [];
        let matchedCount = 0;
        let notFoundCount = 0;

        for (const record of existingData) {
            const englishName = englishNameMapping.get(record.company_id);

            if (englishName) {
                matchedCount++;
                updatePromises.push(
                    supabase
                        .from('company_directory_mapping')
                        .update({ english_name: englishName })
                        .eq('id', record.id)
                );

                // バッチ処理（50件ずつ）
                if (updatePromises.length >= 50) {
                    console.log(`🔄 Processing batch... (${matchedCount} records processed)`);
                    const results = await Promise.allSettled(updatePromises);

                    const errors = results.filter(r => r.status === 'rejected');
                    if (errors.length > 0) {
                        console.log(`⚠️ ${errors.length} errors in batch`);
                    }

                    updatePromises.length = 0; // 配列をクリア
                    await new Promise(resolve => setTimeout(resolve, 1000)); // レート制限対策
                }
            } else {
                notFoundCount++;
            }
        }

        // 残りのバッチを処理
        if (updatePromises.length > 0) {
            console.log(`🔄 Processing final batch... (${updatePromises.length} records)`);
            const results = await Promise.allSettled(updatePromises);

            const errors = results.filter(r => r.status === 'rejected');
            if (errors.length > 0) {
                console.log(`⚠️ ${errors.length} errors in final batch`);
            }
        }

        // Step 6: 結果レポート
        console.log('\n📊 Step 6: Generating report...');

        const report = {
            timestamp: new Date().toISOString(),
            excel_total_records: jsonData.length,
            valid_mappings_created: validRecords,
            existing_db_records: existingData.length,
            matched_for_update: matchedCount,
            not_found_english_names: notFoundCount,
            sample_mappings: Array.from(englishNameMapping.entries()).slice(0, 10).map(([id, name]) => ({
                company_id: id,
                english_name: name
            }))
        };

        fs.writeFileSync('C:/Users/pumpk/english_name_update_report.json', JSON.stringify(report, null, 2), 'utf8');

        console.log('\n🎉 English name mapping completed successfully!');
        console.log(`📝 Excel records processed: ${jsonData.length}`);
        console.log(`🎯 Valid English name mappings: ${validRecords}`);
        console.log(`🔄 Database records matched: ${matchedCount}`);
        console.log(`❓ Records without English names: ${notFoundCount}`);
        console.log(`📁 Report saved to: C:/Users/pumpk/english_name_update_report.json`);

        return report;

    } catch (error) {
        console.error(`❌ Error in createEnglishNameMapping: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
createEnglishNameMapping()
    .then(result => {
        if (result) {
            console.log('\n✅ Process completed successfully!');
        } else {
            console.log('\n💥 Process failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`💥 Unhandled error: ${error.message}`);
        process.exit(1);
    });