// Test script for markdown-documents API endpoint
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const API_BASE = 'http://localhost:3005/api/v1/markdown-documents';

async function testAPI() {
  console.log('=== Markdown Documents API テスト ===\n');

  // Test 1: Search for クスリのアオキ
  console.log('1. クスリのアオキを検索:');
  try {
    const searchQuery = encodeURIComponent('クスリのアオキ');
    const response = await fetch(`${API_BASE}?query=${searchQuery}&limit=5`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Found: ${data.data?.length || 0} documents`);
    if (data.data && data.data.length > 0) {
      console.log('  Sample results:');
      data.data.slice(0, 3).forEach(doc => {
        console.log(`    - ${doc.company_name} (${doc.fiscal_year}): ${doc.file_name}`);
      });
    }
    console.log();
  } catch (error) {
    console.error('  Error:', error.message);
    console.log();
  }

  // Test 2: Get documents with content
  console.log('2. コンテンツ付きでドキュメント取得:');
  try {
    const response = await fetch(`${API_BASE}?limit=2&include_content=true`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Retrieved: ${data.data?.length || 0} documents`);
    if (data.data && data.data.length > 0) {
      data.data.forEach(doc => {
        const hasContent = doc.content ? 'Yes' : 'No';
        const contentLength = doc.content ? doc.content.length : 0;
        console.log(`    - ${doc.company_name}: Content=${hasContent} (${contentLength} chars)`);
      });
    }
    console.log();
  } catch (error) {
    console.error('  Error:', error.message);
    console.log();
  }

  // Test 3: Search by company_id using POST
  console.log('3. POST: 特定企業のドキュメント取得:');
  try {
    // First get a company_id from metadata
    const searchResponse = await fetch(`${API_BASE}?limit=1`);
    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.length > 0) {
      const testCompanyId = searchData.data[0].company_id;
      const testCompanyName = searchData.data[0].company_name;
      
      console.log(`  Testing with: ${testCompanyName} (${testCompanyId})`);
      
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: testCompanyId
        })
      });
      
      const data = await response.json();
      console.log(`  Status: ${response.status}`);
      console.log(`  Documents found: ${data.documents?.length || 0}`);
      console.log(`  Successful downloads: ${data.summary?.successful_downloads || 0}`);
      console.log(`  Failed downloads: ${data.summary?.failed_downloads || 0}`);
      
      if (data.documents && data.documents.length > 0) {
        console.log('  Files:');
        data.documents.slice(0, 5).forEach(doc => {
          const contentStatus = doc.content ? '✓' : '✗';
          console.log(`    ${contentStatus} ${doc.file_name}`);
        });
      }
    }
    console.log();
  } catch (error) {
    console.error('  Error:', error.message);
    console.log();
  }

  // Test 4: Search by fiscal year
  console.log('4. 年度別検索 (FY2021):');
  try {
    const response = await fetch(`${API_BASE}?fiscal_year=FY2021&limit=5`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Found: ${data.data?.length || 0} documents`);
    console.log(`  Total available: ${data.pagination?.total || 0}`);
    if (data.data && data.data.length > 0) {
      console.log('  Companies:');
      const companies = [...new Set(data.data.map(d => d.company_name))];
      companies.forEach(company => {
        console.log(`    - ${company}`);
      });
    }
    console.log();
  } catch (error) {
    console.error('  Error:', error.message);
    console.log();
  }

  // Test 5: Pagination test
  console.log('5. ページネーションテスト:');
  try {
    const response1 = await fetch(`${API_BASE}?limit=10&offset=0`);
    const data1 = await response1.json();
    
    const response2 = await fetch(`${API_BASE}?limit=10&offset=10`);
    const data2 = await response2.json();
    
    console.log(`  Page 1: ${data1.data?.length || 0} documents`);
    console.log(`  Page 2: ${data2.data?.length || 0} documents`);
    console.log(`  Total documents: ${data1.pagination?.total || 'Unknown'}`);
    console.log(`  Has more pages: ${data2.pagination?.hasMore || false}`);
    console.log();
  } catch (error) {
    console.error('  Error:', error.message);
    console.log();
  }

  console.log('=== テスト完了 ===');
}

// Run tests
testAPI().catch(console.error);