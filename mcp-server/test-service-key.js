#!/usr/bin/env node

/**
 * Test Service Role Key Access
 * Service Role Keyでのアクセステスト
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testAccess() {
  console.log('='.repeat(50));
  console.log('Service Role Key Test');
  console.log('='.repeat(50));
  
  // 1. Test companies table
  console.log('\n1. Testing companies table...');
  try {
    const { data: companies, error, count } = await supabase
      .from('companys')  // Note: might be 'companys' not 'companies'
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log('   Error with companys table:', error.message);
      
      // Try 'companies' (plural)
      const { data: companies2, error: error2, count: count2 } = await supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (error2) {
        console.log('   Error with companies table:', error2.message);
      } else {
        console.log(`   ✓ Found ${count2} companies in 'companies' table`);
        if (companies2 && companies2.length > 0) {
          console.log('   Sample data:');
          companies2.forEach(c => {
            console.log(`     - ${c.id || c.company_id}: ${c.company_name || c.name}`);
          });
        }
      }
    } else {
      console.log(`   ✓ Found ${count} companies in 'companys' table`);
      if (companies && companies.length > 0) {
        console.log('   Sample data:');
        companies.forEach(c => {
          console.log(`     - ${c.id || c.company_id}: ${c.company_name || c.name}`);
        });
      }
    }
  } catch (err) {
    console.log('   Exception:', err.message);
  }

  // 2. Get table schema
  console.log('\n2. Getting table columns...');
  try {
    // Try to get schema info using system tables
    const { data: columns, error } = await supabase
      .from('companys')
      .select('*')
      .limit(1);
    
    if (!error && columns && columns.length > 0) {
      console.log('   Columns in companys table:', Object.keys(columns[0]).join(', '));
    }
  } catch (err) {
    console.log('   Could not get schema:', err.message);
  }

  // 3. Test Storage access
  console.log('\n3. Testing Storage access...');
  try {
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list('', { limit: 10 });
    
    if (error) {
      console.log('   Storage error:', error.message);
    } else if (files && files.length > 0) {
      console.log(`   ✓ Storage accessible - Found ${files.length} items`);
      console.log('   Root folders:', files.map(f => f.name).slice(0, 5).join(', '));
    }
  } catch (err) {
    console.log('   Storage exception:', err.message);
  }

  // 4. Search for specific companies
  console.log('\n4. Searching for specific companies...');
  const searchTerms = ['亀田', 'トヨタ', 'ソニー'];
  
  for (const term of searchTerms) {
    try {
      const { data, error } = await supabase
        .from('companys')
        .select('*')
        .or(`company_name.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`   ✓ Found "${term}": ${data[0].id || data[0].company_id} - ${data[0].company_name || data[0].name}`);
      } else {
        console.log(`   ❌ Not found: "${term}"`);
      }
    } catch (err) {
      // Silent fail
    }
  }

  // 5. Check specific paths in Storage
  console.log('\n5. Checking Storage structure...');
  const checkPaths = ['2021', 'FY2021', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020'];
  
  for (const path of checkPaths) {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .list(path, { limit: 1 });
    
    if (!error && data && data.length > 0) {
      console.log(`   ✓ Path exists: ${path}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test complete');
}

testAccess().catch(console.error);