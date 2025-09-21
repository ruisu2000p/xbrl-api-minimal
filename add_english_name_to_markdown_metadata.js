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

async function addEnglishNameToMarkdownMetadata() {
    try {
        console.log('🚀 Starting markdown_files_metadata English name integration...');

        // Step 1: テーブル拡張（スキップしてデータ統合を直接実行）
        console.log('\n📋 Step 1: Extending markdown_files_metadata table...');

        const tableExtensions = [
            {
                sql: `ALTER TABLE public.markdown_files_metadata ADD COLUMN IF NOT EXISTS english_name TEXT;`,
                description: 'Adding english_name column to markdown_files_metadata'
            },
            {
                sql: `CREATE INDEX IF NOT EXISTS idx_markdown_metadata_english_name ON public.markdown_files_metadata USING gin(english_name gin_trgm_ops);`,
                description: 'Creating English name search index on markdown_files_metadata'
            }
        ];

        for (const extension of tableExtensions) {
            const success = await executeSQL(extension.sql, extension.description);
            if (!success) {
                console.log('⚠️ Continuing despite SQL error (may need to run in SQL Editor)...');
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Step 2: Excelファイル読み込み
        console.log('\n📖 Step 2: Reading Excel file for English name mapping...');

        const workbook = XLSX.readFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Found ${jsonData.length} records in Excel file`);

        // Step 3: 英語名マッピング作成（docID基準）
        console.log('\n🎯 Step 3: Creating docID to English name mapping...');

        const docIdToEnglishName = new Map();
        let validEnglishRecords = 0;

        for (const row of jsonData) {
            const docID = row['docID'];
            const englishName = row['English__company name'];

            if (docID && englishName && englishName.trim()) {
                if (!docIdToEnglishName.has(docID)) {
                    docIdToEnglishName.set(docID, englishName.trim());
                    validEnglishRecords++;
                }
            }
        }

        console.log(`✅ Created mapping for ${validEnglishRecords} unique docIDs to English names`);

        // Step 4: 既存のmarkdown_files_metadataデータを取得
        console.log('\n🔍 Step 4: Fetching existing markdown_files_metadata records...');

        const { data: metadataRecords, error: fetchError } = await supabase
            .from('markdown_files_metadata')
            .select('id, company_id, company_name, fiscal_year, file_name, file_type');

        if (fetchError) {
            throw new Error(`Failed to fetch markdown metadata: ${fetchError.message}`);
        }

        console.log(`📋 Found ${metadataRecords.length} existing records in markdown_files_metadata`);

        // Step 5: company_directory_mappingから英語名情報も取得
        console.log('\n🔍 Step 5: Fetching English names from company_directory_mapping...');

        const { data: directoryMappings, error: dirError } = await supabase
            .from('company_directory_mapping')
            .select('company_id, fiscal_year, english_name')
            .not('english_name', 'is', null);

        if (dirError) {
            console.error(`⚠️ Warning: Could not fetch directory mappings: ${dirError.message}`);
        }

        const directoryEnglishMap = new Map();
        if (directoryMappings) {
            for (const mapping of directoryMappings) {
                const key = `${mapping.fiscal_year}-${mapping.company_id}`;
                directoryEnglishMap.set(key, mapping.english_name);
            }
            console.log(`📋 Found ${directoryMappings.length} English names in company_directory_mapping`);
        }

        // Step 6: マッチングとアップデート
        console.log('\n🔄 Step 6: Matching and updating records...');

        const updatePromises = [];
        let matchedFromDocId = 0;
        let matchedFromDirectory = 0;
        let notFoundCount = 0;

        for (const record of metadataRecords) {
            let englishName = null;

            // 優先順位1: docIDから直接マッチング
            if (record.company_id) {
                englishName = docIdToEnglishName.get(record.company_id);
                if (englishName) {
                    matchedFromDocId++;
                }
            }

            // 優先順位2: company_directory_mappingからマッチング
            if (!englishName && record.fiscal_year && record.company_id) {
                const key = `${record.fiscal_year}-${record.company_id}`;
                englishName = directoryEnglishMap.get(key);
                if (englishName) {
                    matchedFromDirectory++;
                }
            }

            if (englishName) {
                updatePromises.push(
                    supabase
                        .from('markdown_files_metadata')
                        .update({ english_name: englishName })
                        .eq('id', record.id)
                );

                // バッチ処理（50件ずつ）
                if (updatePromises.length >= 50) {
                    console.log(`🔄 Processing batch... (${matchedFromDocId + matchedFromDirectory} records processed)`);
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

        // Step 7: 結果レポート
        console.log('\n📊 Step 7: Generating report...');

        const totalMatched = matchedFromDocId + matchedFromDirectory;
        const report = {
            timestamp: new Date().toISOString(),
            excel_total_records: jsonData.length,
            valid_english_mappings: validEnglishRecords,
            metadata_total_records: metadataRecords.length,
            matched_from_docid: matchedFromDocId,
            matched_from_directory: matchedFromDirectory,
            total_matched: totalMatched,
            not_found_english_names: notFoundCount,
            success_rate_percentage: ((totalMatched / metadataRecords.length) * 100).toFixed(2),
            sample_mappings: Array.from(docIdToEnglishName.entries()).slice(0, 10).map(([id, name]) => ({
                company_id: id,
                english_name: name
            }))
        };

        fs.writeFileSync('C:/Users/pumpk/markdown_metadata_english_update_report.json', JSON.stringify(report, null, 2), 'utf8');

        console.log('\n🎉 Markdown metadata English name integration completed successfully!');
        console.log(`📝 Excel records processed: ${jsonData.length}`);
        console.log(`🎯 Valid English name mappings created: ${validEnglishRecords}`);
        console.log(`📋 Metadata records processed: ${metadataRecords.length}`);
        console.log(`🔄 Matched from docID: ${matchedFromDocId}`);
        console.log(`🔄 Matched from directory mapping: ${matchedFromDirectory}`);
        console.log(`✅ Total records updated: ${totalMatched}`);
        console.log(`❓ Records without English names: ${notFoundCount}`);
        console.log(`📈 Success rate: ${report.success_rate_percentage}%`);
        console.log(`📁 Report saved to: C:/Users/pumpk/markdown_metadata_english_update_report.json`);

        return report;

    } catch (error) {
        console.error(`❌ Error in addEnglishNameToMarkdownMetadata: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
addEnglishNameToMarkdownMetadata()
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