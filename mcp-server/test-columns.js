#!/usr/bin/env node

/**
 * Test to discover actual column names in companies table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function discoverColumns() {
  console.log('='.repeat(50));
  console.log('Discovering Companies Table Structure');
  console.log('='.repeat(50));
  
  try {
    // Get first row to see column names
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('\nColumn names found:');
      columns.forEach(col => {
        const value = data[0][col];
        const valueType = typeof value;
        const preview = valueType === 'string' && value ? 
          value.substring(0, 50) + (value.length > 50 ? '...' : '') : 
          value;
        console.log(`  - ${col} (${valueType}): ${preview}`);
      });
      
      console.log('\n' + '='.repeat(50));
      console.log('First record details:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    // Try different queries to find text columns
    console.log('\n' + '='.repeat(50));
    console.log('Testing search on different columns...');
    
    const searchTests = [
      { column: 'name', value: 'トヨタ' },
      { column: 'company_name', value: 'トヨタ' },
      { column: 'japanese_name', value: 'トヨタ' },
      { column: 'english_name', value: 'TOYOTA' },
      { column: 'ticker', value: '7203' },
      { column: 'ticker_symbol', value: '7203' },
      { column: 'code', value: '7203' },
      { column: 'securities_code', value: '7203' }
    ];
    
    for (const test of searchTests) {
      try {
        const { data: searchData, error: searchError } = await supabase
          .from('companies')
          .select('*')
          .ilike(test.column, `%${test.value}%`)
          .limit(1);
        
        if (!searchError && searchData && searchData.length > 0) {
          console.log(`✓ Found using ${test.column}: ${test.value}`);
          console.log(`  Company: ${JSON.stringify(searchData[0]).substring(0, 100)}...`);
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    // Try text search on all columns
    console.log('\n' + '='.repeat(50));
    console.log('Testing OR searches...');
    
    const orSearches = [
      'name.ilike.%トヨタ%,japanese_name.ilike.%トヨタ%',
      'name.ilike.%トヨタ%,english_name.ilike.%TOYOTA%',
      'ticker.eq.7203,securities_code.eq.7203',
      'id.eq.S1000012,ticker.eq.7203'
    ];
    
    for (const orQuery of orSearches) {
      try {
        const { data: orData, error: orError } = await supabase
          .from('companies')
          .select('*')
          .or(orQuery)
          .limit(1);
        
        if (!orError && orData && orData.length > 0) {
          console.log(`✓ Found using OR query: ${orQuery}`);
        }
      } catch (e) {
        // Silent fail
      }
    }
    
  } catch (error) {
    console.log('Exception:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Discovery complete');
}

discoverColumns().catch(console.error);