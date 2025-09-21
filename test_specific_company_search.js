const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSpecificCompanySearch() {
    try {
        console.log('🔍 Testing specific company searches...\n');

        // 英語名が正しく統合されているかを確認
        console.log('📝 Test 1: Checking English name integration');
        const { data: englishNameStats, error: statsError } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact' })
            .not('english_name', 'is', null);

        console.log(`✅ Records with English names: ${englishNameStats?.length || 0}`);

        // 実際の英語企業名をサンプル表示
        console.log('\n📝 Test 2: Sample English company names');
        const { data: sampleEnglish, error: sampleError } = await supabase
            .from('markdown_files_metadata')
            .select('company_name, english_name, fiscal_year')
            .not('english_name', 'is', null)
            .limit(10);

        if (sampleEnglish) {
            sampleEnglish.forEach((record, i) => {
                console.log(`   ${i + 1}. ${record.company_name} → ${record.english_name}`);
            });
        }

        // トヨタ系企業を検索
        console.log('\n📝 Test 3: Toyota-related companies');
        const { data: toyotaCompanies, error: toyotaError } = await supabase
            .from('markdown_files_metadata')
            .select('company_name, english_name, fiscal_year')
            .or('company_name.ilike.%トヨタ%,english_name.ilike.%Toyota%');

        console.log(`✅ Found ${toyotaCompanies?.length || 0} Toyota-related records`);
        if (toyotaCompanies && toyotaCompanies.length > 0) {
            toyotaCompanies.slice(0, 5).forEach((record, i) => {
                console.log(`   ${i + 1}. ${record.company_name} / ${record.english_name} (${record.fiscal_year})`);
            });
        }

        // ソニー系企業を検索
        console.log('\n📝 Test 4: Sony-related companies');
        const { data: sonyCompanies, error: sonyError } = await supabase
            .from('markdown_files_metadata')
            .select('company_name, english_name, fiscal_year')
            .or('company_name.ilike.%ソニー%,english_name.ilike.%Sony%');

        console.log(`✅ Found ${sonyCompanies?.length || 0} Sony-related records`);
        if (sonyCompanies && sonyCompanies.length > 0) {
            sonyCompanies.slice(0, 5).forEach((record, i) => {
                console.log(`   ${i + 1}. ${record.company_name} / ${record.english_name} (${record.fiscal_year})`);
            });
        }

        // Honda/ホンダ系企業を検索
        console.log('\n📝 Test 5: Honda-related companies');
        const { data: hondaCompanies, error: hondaError } = await supabase
            .from('markdown_files_metadata')
            .select('company_name, english_name, fiscal_year')
            .or('company_name.ilike.%ホンダ%,english_name.ilike.%Honda%');

        console.log(`✅ Found ${hondaCompanies?.length || 0} Honda-related records`);
        if (hondaCompanies && hondaCompanies.length > 0) {
            hondaCompanies.slice(0, 5).forEach((record, i) => {
                console.log(`   ${i + 1}. ${record.company_name} / ${record.english_name} (${record.fiscal_year})`);
            });
        }

        // 完全英語名検索の実例
        console.log('\n📝 Test 6: Direct English name search examples');
        const englishSearchTerms = ['IZUMI', 'FRONTIER', 'ANYCOLOR', 'TOSHIN'];

        for (const term of englishSearchTerms) {
            const { data: englishResults, error: englishError } = await supabase
                .from('markdown_files_metadata')
                .select('company_name, english_name, fiscal_year')
                .ilike('english_name', `%${term}%`)
                .limit(3);

            console.log(`\n🔍 English search "${term}": ${englishResults?.length || 0} results`);
            if (englishResults && englishResults.length > 0) {
                englishResults.forEach(record => {
                    console.log(`   - ${record.company_name} / ${record.english_name}`);
                });
            }
        }

        // 統計の詳細確認
        console.log('\n📝 Test 7: Detailed statistics');
        const { data: totalCount } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true });

        const { data: withEnglishCount } = await supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact', head: true })
            .not('english_name', 'is', null);

        const total = totalCount?.length || 0;
        const withEnglish = withEnglishCount?.length || 0;
        const percentage = total > 0 ? ((withEnglish / total) * 100).toFixed(2) : 0;

        console.log(`📊 Total metadata records: ${total}`);
        console.log(`📊 Records with English names: ${withEnglish}`);
        console.log(`📊 Coverage percentage: ${percentage}%`);

        console.log('\n🎉 Specific company search testing completed!');

        return {
            success: true,
            total_records: total,
            english_coverage: withEnglish,
            coverage_percentage: percentage
        };

    } catch (error) {
        console.error(`❌ Error in testSpecificCompanySearch: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
testSpecificCompanySearch()
    .then(result => {
        if (result) {
            console.log('\n✅ All specific search tests completed successfully!');
            console.log(`📈 Final Coverage: ${result.coverage_percentage}% (${result.english_coverage}/${result.total_records})`);
        } else {
            console.log('\n💥 Testing failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`💥 Unhandled error: ${error.message}`);
        process.exit(1);
    });