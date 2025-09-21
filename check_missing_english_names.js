const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkMissingEnglishNames() {
    try {
        console.log('🔍 Checking for missing English names...\n');

        // Step 1: 英語名がないレコードを確認
        console.log('📝 Step 1: Records without English names');
        const { data: missingEnglish, error: missingError } = await supabase
            .from('markdown_files_metadata')
            .select('company_id, company_name, fiscal_year')
            .is('english_name', null)
            .limit(20);

        if (missingError) {
            console.error(`❌ Error: ${missingError.message}`);
            return;
        }

        console.log(`📊 Found ${missingEnglish?.length || 0} records without English names`);
        if (missingEnglish && missingEnglish.length > 0) {
            console.log('\n🔍 Sample records missing English names:');
            missingEnglish.forEach((record, i) => {
                console.log(`   ${i + 1}. ${record.company_id}: ${record.company_name} (${record.fiscal_year})`);
            });
        }

        // Step 2: Excelファイルで対応する英語名があるかチェック
        console.log('\n📝 Step 2: Checking Excel file for missing companies');

        const workbook = XLSX.readFile('C:/Users/pumpk/Downloads/merged_financial_fdi_complete.xlsx');
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Excel file contains ${jsonData.length} records`);

        // Step 3: 欠けているcompany_idがExcelにあるかチェック
        if (missingEnglish && missingEnglish.length > 0) {
            console.log('\n📝 Step 3: Looking for missing company_ids in Excel');

            for (const missing of missingEnglish.slice(0, 10)) {
                const excelRecord = jsonData.find(row => row['docID'] === missing.company_id);
                if (excelRecord) {
                    const englishName = excelRecord['English__company name'];
                    console.log(`   ✅ Found: ${missing.company_id} → ${englishName}`);
                } else {
                    console.log(`   ❌ Missing: ${missing.company_id} (${missing.company_name})`);
                }
            }
        }

        // Step 4: 特定企業（トヨタ、ソニー、ホンダ）の詳細確認
        console.log('\n📝 Step 4: Checking major companies specifically');

        const majorCompanies = ['トヨタ', 'ソニー', 'ホンダ', '任天堂'];

        for (const company of majorCompanies) {
            console.log(`\n🔍 Checking ${company} companies:`);

            const { data: companyRecords, error: companyError } = await supabase
                .from('markdown_files_metadata')
                .select('company_id, company_name, english_name, fiscal_year')
                .ilike('company_name', `%${company}%`)
                .limit(5);

            if (companyRecords && companyRecords.length > 0) {
                companyRecords.forEach(record => {
                    const status = record.english_name ? '✅' : '❌';
                    console.log(`   ${status} ${record.company_id}: ${record.company_name} → ${record.english_name || 'NULL'}`);
                });

                // Excelでこれらの企業を探す
                const firstRecord = companyRecords[0];
                if (!firstRecord.english_name) {
                    const excelMatch = jsonData.find(row => row['docID'] === firstRecord.company_id);
                    if (excelMatch) {
                        console.log(`   📋 Excel has: ${excelMatch['English__company name']}`);
                    } else {
                        console.log(`   📋 Not found in Excel for docID: ${firstRecord.company_id}`);

                        // 企業名での部分一致を試す
                        const nameMatches = jsonData.filter(row =>
                            row['企業名'] && row['企業名'].includes(company)
                        ).slice(0, 3);

                        if (nameMatches.length > 0) {
                            console.log(`   📋 Similar names in Excel:`);
                            nameMatches.forEach(match => {
                                console.log(`      ${match['docID']}: ${match['企業名']} → ${match['English__company name']}`);
                            });
                        }
                    }
                }
            } else {
                console.log(`   No records found for ${company}`);
            }
        }

        // Step 5: 統計情報
        console.log('\n📝 Step 5: Overall statistics');

        const { data: totalRecords } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true });

        const { data: withEnglishRecords } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true })
            .not('english_name', 'is', null);

        const { data: withoutEnglishRecords } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true })
            .is('english_name', null);

        console.log(`📊 Total records: ${totalRecords?.count || 0}`);
        console.log(`📊 With English names: ${withEnglishRecords?.count || 0}`);
        console.log(`📊 Without English names: ${withoutEnglishRecords?.count || 0}`);
        console.log(`📊 Coverage: ${totalRecords?.count > 0 ? ((withEnglishRecords?.count || 0) / totalRecords.count * 100).toFixed(2) : 0}%`);

        return {
            total: totalRecords?.count || 0,
            with_english: withEnglishRecords?.count || 0,
            without_english: withoutEnglishRecords?.count || 0
        };

    } catch (error) {
        console.error(`❌ Error in checkMissingEnglishNames: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
checkMissingEnglishNames()
    .then(result => {
        if (result) {
            console.log('\n✅ Analysis completed successfully!');
        } else {
            console.log('\n💥 Analysis failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`💥 Unhandled error: ${error.message}`);
        process.exit(1);
    });