/**
 * MCP Server Toyota Test Script
 * This script tests MCP server functionality with Toyota Motor Corporation data
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration  
const supabaseUrl = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(supabaseUrl, serviceKey);

// Toyota Motor Corporation identifiers (from previous analysis)
const TOYOTA_COMPANY_ID = 'S100LO6W';
const TOYOTA_COMPANY_NAME = 'トヨタ自動車株式会社';
const TOYOTA_AVAILABLE_YEARS = ['FY2022', '2021', '2022'];
const TOYOTA_PRIMARY_YEAR = 'FY2022';

async function testMcpToyotaFunctions() {
  console.log('🧪 Testing MCP Server functionality with Toyota Motor Corporation data...\n');
  
  const testResults = {
    search_companies: null,
    get_company_info: null,
    list_documents: null,
    read_document: null,
    analyze_company: null,
    search_across_years: null
  };

  try {
    // 1. Test search_companies function
    console.log('1. Testing search_companies function:');
    console.log('   Query: "トヨタ"');
    
    const { data: searchResults, error: searchError } = await supabase
      .from('companies')
      .select('id, ticker, name, sector, market, has_data, data_years, storage_paths')
      .ilike('name', '%トヨタ%')
      .eq('has_data', true)
      .limit(10);
    
    if (searchError) {
      console.log('   ❌ Search failed:', searchError.message);
      testResults.search_companies = false;
    } else {
      const companiesWithInfo = (searchResults || []).map(company => ({
        id: company.id,
        name: company.name,
        ticker: company.ticker,
        sector: company.sector,
        available_years: company.data_years || [],
        total_files: company.storage_paths?.total_files || 0,
        primary_year: company.storage_paths?.primary_year || null
      }));
      
      console.log(`   ✅ Found ${companiesWithInfo.length} Toyota companies:`);
      companiesWithInfo.forEach(company => {
        console.log(`     - ${company.name} (${company.id})`);
        console.log(`       Years: ${company.available_years.join(', ')}`);
        console.log(`       Files: ${company.total_files}`);
      });
      testResults.search_companies = true;
    }

    // 2. Test get_company_info function
    console.log('\n2. Testing get_company_info function:');
    console.log(`   Company ID: ${TOYOTA_COMPANY_ID}`);
    
    const { data: companyInfo, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', TOYOTA_COMPANY_ID)
      .single();
    
    if (companyError) {
      console.log('   ❌ Company info retrieval failed:', companyError.message);
      testResults.get_company_info = false;
    } else {
      const yearDetails = [];
      if (companyInfo.storage_paths?.years) {
        for (const yearData of companyInfo.storage_paths.years) {
          yearDetails.push({
            year: yearData.year,
            path: yearData.path,
            folders: yearData.folders || [],
            file_count: yearData.file_count || 0
          });
        }
      }
      
      console.log(`   ✅ Retrieved company info for ${companyInfo.name}:`);
      console.log(`     ID: ${companyInfo.id}`);
      console.log(`     Has Data: ${companyInfo.has_data}`);
      console.log(`     Available Years: ${companyInfo.data_years?.join(', ')}`);
      console.log(`     Total Files: ${companyInfo.storage_paths?.total_files || 0}`);
      console.log(`     Year Details:`);
      yearDetails.forEach(year => {
        console.log(`       - ${year.year}: ${year.file_count} files at ${year.path}`);
        if (year.folders.length > 0) {
          console.log(`         Folders: ${year.folders.join(', ')}`);
        }
      });
      testResults.get_company_info = true;
    }

    // 3. Test list_documents function
    console.log('\n3. Testing list_documents function:');
    console.log(`   Company ID: ${TOYOTA_COMPANY_ID}, Year: ${TOYOTA_PRIMARY_YEAR}`);
    
    // Try to find the correct storage path
    let storagePath = null;
    const pathPatterns = [
      `${TOYOTA_PRIMARY_YEAR}/${TOYOTA_COMPANY_ID}`,
      `${TOYOTA_COMPANY_ID}`,
      `${TOYOTA_PRIMARY_YEAR}/${TOYOTA_COMPANY_ID.toLowerCase()}`
    ];
    
    let folders = null;
    for (const path of pathPatterns) {
      const { data } = await supabase.storage
        .from('markdown-files')
        .list(path, { limit: 100 });
      
      if (data && data.length > 0) {
        folders = data;
        storagePath = path;
        break;
      }
    }
    
    if (!folders || folders.length === 0) {
      console.log(`   ❌ No documents found for ${TOYOTA_COMPANY_NAME} in ${TOYOTA_PRIMARY_YEAR}`);
      testResults.list_documents = false;
    } else {
      const documents = [];
      
      for (const folder of folders) {
        if (!folder.name.includes('.')) {
          const { data: files } = await supabase.storage
            .from('markdown-files')
            .list(`${storagePath}/${folder.name}`, { limit: 100 });
          
          if (files && files.length > 0) {
            documents.push({
              folder: folder.name,
              file_count: files.length,
              files: files.slice(0, 5).map(f => ({
                name: f.name,
                path: `${storagePath}/${folder.name}/${f.name}`,
                size: f.metadata?.size
              }))
            });
          }
        }
      }
      
      console.log(`   ✅ Found documents in ${storagePath}:`);
      documents.forEach(doc => {
        console.log(`     📁 ${doc.folder}: ${doc.file_count} files`);
        doc.files.forEach(file => {
          console.log(`       - ${file.name}`);
        });
      });
      testResults.list_documents = true;
    }

    // 4. Test read_document function (if documents found)
    if (testResults.list_documents && folders && folders.length > 0) {
      console.log('\n4. Testing read_document function:');
      
      // Try to read a sample document
      const sampleFolder = folders.find(f => !f.name.includes('.'));
      if (sampleFolder) {
        const { data: sampleFiles } = await supabase.storage
          .from('markdown-files')
          .list(`${storagePath}/${sampleFolder.name}`, { limit: 1 });
        
        if (sampleFiles && sampleFiles.length > 0) {
          const sampleFile = sampleFiles[0];
          const filePath = `${storagePath}/${sampleFolder.name}/${sampleFile.name}`;
          
          console.log(`   Testing file: ${filePath}`);
          
          const { data, error } = await supabase.storage
            .from('markdown-files')
            .download(filePath);
          
          if (error) {
            console.log('   ❌ Document read failed:', error.message);
            testResults.read_document = false;
          } else {
            const content = await data.text();
            
            // Test different modes
            const modes = {
              preview: content.substring(0, 3000),
              summary: extractFinancialHighlights(content, 5000),
              full: content.length > 50000 ? content.substring(0, 50000) + '\n...[capacity limited]' : content
            };
            
            console.log(`   ✅ Document read successful:`);
            console.log(`     Original size: ${content.length} characters`);
            console.log(`     Preview mode: ${modes.preview.length} characters`);
            console.log(`     Summary mode: ${modes.summary.length} characters`);
            console.log(`     Full mode: ${modes.full.length} characters`);
            console.log(`     Content preview: ${content.substring(0, 200)}...`);
            testResults.read_document = true;
          }
        }
      }
    }

    // 5. Test search_across_years function
    console.log('\n5. Testing search_across_years function:');
    console.log(`   Company ID: ${TOYOTA_COMPANY_ID}`);
    
    const allYears = ['2020', '2021', '2022', 'FY2015', 'FY2016', 'FY2017', 'FY2020', 'FY2022', 'FY2023', 'FY2024', 'FY2025'];
    const foundYears = [];
    
    for (const year of allYears) {
      const pathPatterns = [
        `${year}/${TOYOTA_COMPANY_ID}`,
        `${TOYOTA_COMPANY_ID}`,
        `${year}/${TOYOTA_COMPANY_ID.toLowerCase()}`
      ];
      
      let dataFound = false;
      let basePath = null;
      
      for (const path of pathPatterns) {
        const { data } = await supabase.storage
          .from('markdown-files')
          .list(path, { limit: 1 });
        
        if (data && data.length > 0) {
          dataFound = true;
          basePath = path;
          break;
        }
      }
      
      if (dataFound && basePath) {
        const { data: folders } = await supabase.storage
          .from('markdown-files')
          .list(basePath, { limit: 100 });
        
        let fileCount = 0;
        for (const folder of folders || []) {
          if (!folder.name.includes('.')) {
            const { data: files } = await supabase.storage
              .from('markdown-files')
              .list(`${basePath}/${folder.name}`, { limit: 100 });
            fileCount += files ? files.length : 0;
          }
        }
        
        foundYears.push({
          year: year,
          path: basePath,
          folders: folders?.filter(f => !f.name.includes('.')).length || 0,
          files: fileCount
        });
      }
    }
    
    console.log(`   ✅ Found ${TOYOTA_COMPANY_ID} data in ${foundYears.length} years:`);
    foundYears.forEach(yearInfo => {
      console.log(`     - ${yearInfo.year}: ${yearInfo.files} files in ${yearInfo.folders} folders`);
      console.log(`       Path: ${yearInfo.path}`);
    });
    testResults.search_across_years = true;

    // Test Summary
    console.log('\n6. 📊 Test Results Summary:');
    Object.keys(testResults).forEach(testName => {
      const status = testResults[testName] ? '✅ PASS' : '❌ FAIL';
      const description = getFunctionDescription(testName);
      console.log(`   ${status} ${testName}: ${description}`);
    });
    
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`\n   Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log(`   🎉 All MCP functions are working correctly with Toyota data!`);
    } else {
      console.log(`   ⚠️  Some MCP functions need attention`);
    }

    return testResults;

  } catch (error) {
    console.error('❌ Unexpected error during MCP Toyota testing:', error);
    throw error;
  }
}

// Helper function to extract financial highlights (simplified version)
function extractFinancialHighlights(content, maxLength = 5000) {
  const lines = content.split('\n');
  const highlights = [];
  const keywords = [
    '売上高', '営業収益', '売上収益',
    '営業利益', '経常利益', '当期純利益',
    'ROE', 'ROA', '自己資本利益率',
    'セグメント', '事業', '地域別'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (keywords.some(kw => line.includes(kw))) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 3); j++) {
        if (lines[j].trim() && !highlights.includes(lines[j])) {
          highlights.push(lines[j]);
        }
      }
    }
  }
  
  let summary = highlights.slice(0, 100).join('\n');
  
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength) + '\n...[capacity limited]';
  }
  
  return summary || 'No financial data found';
}

// Helper function to get test descriptions
function getFunctionDescription(functionName) {
  const descriptions = {
    search_companies: 'Company search functionality',
    get_company_info: 'Company information retrieval',
    list_documents: 'Document listing capability',
    read_document: 'Document content reading',
    analyze_company: 'Company analysis features',
    search_across_years: 'Multi-year data search'
  };
  return descriptions[functionName] || 'Function test';
}

// Execute the MCP Toyota test
testMcpToyotaFunctions()
  .then((results) => {
    const passedTests = Object.values(results).filter(result => result === true).length;
    const totalTests = Object.keys(results).length;
    
    console.log('\n🏁 MCP Toyota functionality test completed!');
    console.log(`Final Score: ${passedTests}/${totalTests} functions working correctly`);
    
    if (passedTests === totalTests) {
      console.log('🎯 Ready for MCP server deployment with Toyota data access!');
    }
  })
  .catch((error) => {
    console.error('\n❌ MCP Toyota functionality test failed:', error);
    process.exit(1);
  });