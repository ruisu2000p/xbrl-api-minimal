const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMissingEnglishNames() {
    try {
        console.log('🔧 Fixing missing English names...\n');

        // Step 1: Excelデータを読み込み
        console.log('📖 Step 1: Loading Excel data...');
        const workbook = XLSX.readFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Excel contains ${jsonData.length} records`);

        // Step 2: 企業名ベースのマッピングを作成
        console.log('\n📝 Step 2: Creating company name to English name mapping...');

        const companyNameToEnglish = new Map();
        let nameBasedMappings = 0;

        for (const row of jsonData) {
            const japaneseName = row['企業名'];
            const englishName = row['English__company name'];

            if (japaneseName && englishName && englishName.trim()) {
                // 企業名から株式会社などの法人格を除去して正規化
                const normalizedName = japaneseName
                    .replace(/株式会社/g, '')
                    .replace(/（株）/g, '')
                    .replace(/㈱/g, '')
                    .replace(/\s+/g, '')
                    .trim();

                if (normalizedName) {
                    if (!companyNameToEnglish.has(normalizedName)) {
                        companyNameToEnglish.set(normalizedName, englishName.trim());
                        nameBasedMappings++;
                    }
                }
            }
        }

        console.log(`✅ Created ${nameBasedMappings} name-based mappings`);

        // Step 3: 英語名がないレコードを取得
        console.log('\n🔍 Step 3: Fetching records without English names...');

        const { data: missingRecords, error: fetchError } = await supabase
            .from('markdown_files_metadata')
            .select('id, company_id, company_name, fiscal_year')
            .is('english_name', null);

        if (fetchError) {
            throw new Error(`Failed to fetch records: ${fetchError.message}`);
        }

        console.log(`📋 Found ${missingRecords.length} records without English names`);

        // Step 4: 企業名ベースでマッチングして更新
        console.log('\n🔄 Step 4: Matching by company name and updating...');

        const updatePromises = [];
        let matched = 0;
        let notFound = 0;

        for (const record of missingRecords) {
            let englishName = null;

            if (record.company_name) {
                // 正規化された企業名でマッチングを試行
                const normalizedName = record.company_name
                    .replace(/株式会社/g, '')
                    .replace(/（株）/g, '')
                    .replace(/㈱/g, '')
                    .replace(/\s+/g, '')
                    .trim();

                englishName = companyNameToEnglish.get(normalizedName);

                // 完全一致しない場合は部分一致を試行
                if (!englishName) {
                    for (const [japName, engName] of companyNameToEnglish.entries()) {
                        if (normalizedName.includes(japName) || japName.includes(normalizedName)) {
                            englishName = engName;
                            break;
                        }
                    }
                }

                // それでも見つからない場合は、より柔軟な検索
                if (!englishName) {
                    const matchingRow = jsonData.find(row => {
                        const excelName = row['企業名'];
                        if (!excelName) return false;

                        const excelNormalized = excelName
                            .replace(/株式会社/g, '')
                            .replace(/（株）/g, '')
                            .replace(/㈱/g, '')
                            .replace(/\s+/g, '')
                            .trim();

                        return excelNormalized === normalizedName ||
                               excelNormalized.includes(normalizedName) ||
                               normalizedName.includes(excelNormalized);
                    });

                    if (matchingRow && matchingRow['English__company name']) {
                        englishName = matchingRow['English__company name'].trim();
                    }
                }
            }

            if (englishName) {
                matched++;
                updatePromises.push(
                    supabase
                        .from('markdown_files_metadata')
                        .update({ english_name: englishName })
                        .eq('id', record.id)
                );

                console.log(`   ✅ ${record.company_name} → ${englishName}`);

                // バッチ処理（50件ずつ）
                if (updatePromises.length >= 50) {
                    console.log(`🔄 Processing batch... (${matched} matches found)`);
                    const results = await Promise.allSettled(updatePromises);

                    const errors = results.filter(r => r.status === 'rejected');
                    if (errors.length > 0) {
                        console.log(`⚠️ ${errors.length} errors in batch`);
                    }

                    updatePromises.length = 0;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                notFound++;
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

        // Step 5: 特定の主要企業を手動で修正
        console.log('\n🎯 Step 5: Manual fixes for major companies...');

        const manualFixes = [
            { company_id: 'S100LKBH', english_name: 'TOYOTA BOSHOKU CORPORATION' },
            { company_id: 'S100LM4N', english_name: 'SONY GROUP CORPORATION' },
            { company_id: 'S100LK4Y', english_name: 'Nintendo Co.,Ltd.' },
            { company_id: 'S100LP8K', english_name: 'Honda Finance Co., Ltd.' }
        ];

        for (const fix of manualFixes) {
            const { data, error } = await supabase
                .from('markdown_files_metadata')
                .update({ english_name: fix.english_name })
                .eq('company_id', fix.company_id)
                .is('english_name', null);

            if (error) {
                console.error(`❌ Failed to fix ${fix.company_id}: ${error.message}`);
            } else {
                console.log(`✅ Fixed ${fix.company_id} → ${fix.english_name}`);
                matched++;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Step 6: 結果レポート
        console.log('\n📊 Step 6: Final report...');

        const { data: finalStats } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true })
            .not('english_name', 'is', null);

        const totalWithEnglish = finalStats?.count || 0;
        const report = {
            timestamp: new Date().toISOString(),
            records_processed: missingRecords.length,
            newly_matched: matched,
            still_missing: notFound,
            total_with_english_names: totalWithEnglish,
            manual_fixes_applied: manualFixes.length
        };

        console.log(`✅ Successfully matched ${matched} additional records`);
        console.log(`❓ Still missing: ${notFound} records`);
        console.log(`📊 Total records with English names: ${totalWithEnglish}`);

        return report;

    } catch (error) {
        console.error(`❌ Error in fixMissingEnglishNames: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
fixMissingEnglishNames()
    .then(result => {
        if (result) {
            console.log('\n🎉 Missing English names fix completed successfully!');
        } else {
            console.log('\n💥 Fix process failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`💥 Unhandled error: ${error.message}`);
        process.exit(1);
    });