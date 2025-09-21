const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testEnglishSearchFunctionality() {
    try {
        console.log('🔍 Testing English search functionality...\n');

        // Test 1: 英語名での完全一致検索
        console.log('📝 Test 1: Complete English name search (Toyota)');
        const { data: toyotaExact, error: toyotaError } = await supabase
            .from('markdown_files_metadata')
            .select('company_id, company_name, english_name, fiscal_year, file_type')
            .ilike('english_name', '%Toyota%')
            .limit(5);

        if (toyotaError) {
            console.error(`❌ Toyota search error: ${toyotaError.message}`);
        } else {
            console.log(`✅ Found ${toyotaExact?.length || 0} Toyota records`);
            if (toyotaExact && toyotaExact.length > 0) {
                toyotaExact.forEach((record, i) => {
                    console.log(`   ${i + 1}. ${record.english_name} (${record.company_name}) - ${record.fiscal_year}`);
                });
            }
        }

        console.log('\n' + '─'.repeat(60) + '\n');

        // Test 2: pg_trgmを使ったファジー検索
        console.log('📝 Test 2: Fuzzy search using pg_trgm (Honda variations)');
        const { data: hondaFuzzy, error: hondaError } = await supabase
            .rpc('execute_sql', {
                query: `
                    SELECT company_id, company_name, english_name, fiscal_year, file_type,
                           similarity(english_name, 'Honda') as similarity_score
                    FROM markdown_files_metadata
                    WHERE english_name % 'Honda'
                       OR english_name ILIKE '%Honda%'
                    ORDER BY similarity_score DESC
                    LIMIT 5;
                `
            });

        if (hondaError) {
            console.error(`❌ Honda fuzzy search error: ${hondaError.message}`);
        } else {
            console.log(`✅ Found Honda-related records with fuzzy matching`);
            if (hondaFuzzy && Array.isArray(hondaFuzzy)) {
                hondaFuzzy.forEach((record, i) => {
                    console.log(`   ${i + 1}. ${record.english_name} (Score: ${record.similarity_score}) - ${record.fiscal_year}`);
                });
            }
        }

        console.log('\n' + '─'.repeat(60) + '\n');

        // Test 3: 多言語混合検索（日本語 + 英語）
        console.log('📝 Test 3: Multilingual search (Japanese + English)');
        const searchTerms = ['ソニー', 'Sony', '任天堂', 'Nintendo'];

        for (const term of searchTerms) {
            console.log(`\n🔍 Searching for: "${term}"`);

            const { data: multiResults, error: multiError } = await supabase
                .from('markdown_files_metadata')
                .select('company_id, company_name, english_name, fiscal_year, file_type')
                .or(`company_name.ilike.%${term}%,english_name.ilike.%${term}%`)
                .limit(3);

            if (multiError) {
                console.error(`❌ Error searching for ${term}: ${multiError.message}`);
            } else {
                console.log(`   Found ${multiResults?.length || 0} results`);
                if (multiResults && multiResults.length > 0) {
                    multiResults.forEach(record => {
                        console.log(`   - ${record.company_name} / ${record.english_name} (${record.fiscal_year})`);
                    });
                }
            }
        }

        console.log('\n' + '─'.repeat(60) + '\n');

        // Test 4: 統計情報の確認
        console.log('📝 Test 4: English name statistics');

        const { data: stats, error: statsError } = await supabase
            .rpc('execute_sql', {
                query: `
                    SELECT
                        COUNT(*) as total_records,
                        COUNT(english_name) as records_with_english_name,
                        COUNT(DISTINCT english_name) as unique_english_names,
                        ROUND(
                            (COUNT(english_name)::decimal / COUNT(*)) * 100, 2
                        ) as coverage_percentage
                    FROM markdown_files_metadata;
                `
            });

        if (statsError) {
            console.error(`❌ Stats error: ${statsError.message}`);
        } else {
            console.log('✅ English name coverage statistics:');
            if (stats && stats.length > 0) {
                const stat = stats[0];
                console.log(`   📊 Total records: ${stat.total_records}`);
                console.log(`   📊 Records with English names: ${stat.records_with_english_name}`);
                console.log(`   📊 Unique English companies: ${stat.unique_english_names}`);
                console.log(`   📊 Coverage percentage: ${stat.coverage_percentage}%`);
            }
        }

        console.log('\n' + '─'.repeat(60) + '\n');

        // Test 5: サンプル英語企業名の表示
        console.log('📝 Test 5: Sample English company names');

        const { data: samples, error: samplesError } = await supabase
            .from('markdown_files_metadata')
            .select('company_name, english_name')
            .not('english_name', 'is', null)
            .limit(10);

        if (samplesError) {
            console.error(`❌ Samples error: ${samplesError.message}`);
        } else {
            console.log('✅ Sample Japanese ↔ English mappings:');
            if (samples && samples.length > 0) {
                samples.forEach((record, i) => {
                    console.log(`   ${i + 1}. ${record.company_name} ↔ ${record.english_name}`);
                });
            }
        }

        // Test 6: 検索パフォーマンステスト
        console.log('\n' + '─'.repeat(60) + '\n');
        console.log('📝 Test 6: Search performance test');

        const searchStartTime = Date.now();

        const { data: perfTest, error: perfError } = await supabase
            .from('markdown_files_metadata')
            .select('company_id, company_name, english_name, fiscal_year')
            .or('company_name.ilike.%株式会社%,english_name.ilike.%Corporation%')
            .limit(20);

        const searchEndTime = Date.now();
        const searchDuration = searchEndTime - searchStartTime;

        if (perfError) {
            console.error(`❌ Performance test error: ${perfError.message}`);
        } else {
            console.log(`✅ Performance test completed in ${searchDuration}ms`);
            console.log(`   Found ${perfTest?.length || 0} records matching Corporation/株式会社`);
        }

        console.log('\n🎉 English search functionality testing completed!');

        return {
            success: true,
            tests_completed: 6,
            performance_ms: searchDuration
        };

    } catch (error) {
        console.error(`❌ Error in testEnglishSearchFunctionality: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// 実行
testEnglishSearchFunctionality()
    .then(result => {
        if (result) {
            console.log('\n✅ All tests completed successfully!');
        } else {
            console.log('\n💥 Testing failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`💥 Unhandled error: ${error.message}`);
        process.exit(1);
    });