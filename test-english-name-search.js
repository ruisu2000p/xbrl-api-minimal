#!/usr/bin/env node

/**
 * English Name Search Test for shared-supabase-mcp-minimal v4.1.0
 * Tests the enhanced search functionality for both Japanese and English company names
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('🔍 Testing English Name Search Functionality');
console.log('='.repeat(60));

async function testSearch(searchTerm, description) {
    console.log(`\n📋 Testing: ${description}`);
    console.log(`🔎 Search term: "${searchTerm}"`);

    try {
        const { stdout, stderr } = await execPromise(`npx shared-supabase-mcp-minimal@4.1.0`, {
            input: JSON.stringify({
                method: 'tools/call',
                params: {
                    name: 'search_companies_by_name',
                    arguments: {
                        company_name: searchTerm,
                        limit: 5
                    }
                }
            }),
            env: {
                ...process.env,
                SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
                XBRL_API_KEY: 'xbrl_demo'
            }
        });

        console.log('✅ Response received');

        // Parse the response
        const lines = stdout.split('\n').filter(line => line.trim());
        const jsonLine = lines.find(line => line.startsWith('{'));

        if (jsonLine) {
            const response = JSON.parse(jsonLine);
            if (response.content && response.content[0] && response.content[0].text) {
                const result = JSON.parse(response.content[0].text);
                console.log(`📊 Found ${result.count} companies`);

                if (result.companies && result.companies.length > 0) {
                    console.log('🏢 Sample results:');
                    result.companies.slice(0, 3).forEach((company, index) => {
                        console.log(`  ${index + 1}. ${company.company_name} ${company.english_name ? `(${company.english_name})` : ''}`);
                    });
                }

                console.log(`🔍 Search fields: ${result.search_fields ? result.search_fields.join(', ') : 'N/A'}`);
            }
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function runTests() {
    const testCases = [
        {
            term: 'Toyota',
            description: 'English name search - Toyota'
        },
        {
            term: 'トヨタ',
            description: 'Japanese name search - トヨタ'
        },
        {
            term: 'SoftBank',
            description: 'English name search - SoftBank'
        },
        {
            term: 'ソフトバンク',
            description: 'Japanese name search - ソフトバンク'
        },
        {
            term: 'Honda',
            description: 'English name search - Honda'
        }
    ];

    console.log(`🚀 Starting ${testCases.length} test cases...\n`);

    for (const testCase of testCases) {
        await testSearch(testCase.term, testCase.description);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('📦 Package: shared-supabase-mcp-minimal@4.1.0');
    console.log('🆕 New feature: Enhanced search with English name support');
    console.log('🔍 Search fields: company_name (Japanese) + english_name (English)');
}

// Run the tests
runTests().catch(console.error);