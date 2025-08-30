#!/usr/bin/env node

/**
 * Supabase Connection Test
 * データベースとStorageの接続テスト
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmekhpY2Z1aGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkzODU1MjAsImV4cCI6MjA0NDk2MTUyMH0.H1NkNDhlBzej5Rqfoc5Nc4L94T6RiKnntUqS4ybTxKo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('='.repeat(50));
  console.log('Supabase Connection Test');
  console.log('='.repeat(50));
  console.log('URL:', SUPABASE_URL);
  console.log('');

  // Test 1: Database Tables
  console.log('1. Testing Database Access...');
  try {
    // List tables using SQL query
    const { data: tables, error } = await supabase
      .rpc('get_tables_list')
      .limit(1);
    
    if (error) {
      // Try direct table access
      console.log('   RPC failed, trying direct table access...');
      
      // Try companies table
      const { data: companies, error: compError, count } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });
      
      if (compError) {
        console.log('   ❌ companies table error:', compError.message);
      } else {
        console.log(`   ✓ companies table exists (count check)`);
      }

      // Try profiles table  
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (profError) {
        console.log('   ❌ profiles table error:', profError.message);
      } else {
        console.log(`   ✓ profiles table exists`);
      }

      // Try to get sample data
      const { data: sampleCompanies, error: sampleError } = await supabase
        .from('companies')
        .select('id, company_name')
        .limit(3);
      
      if (sampleCompanies && sampleCompanies.length > 0) {
        console.log('   Sample companies:', sampleCompanies.map(c => c.company_name).join(', '));
      } else {
        console.log('   No sample data found in companies table');
      }
    }
  } catch (err) {
    console.log('   Database test error:', err.message);
  }

  console.log('');

  // Test 2: Storage Buckets
  console.log('2. Testing Storage Access...');
  try {
    // List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('   ❌ Cannot list buckets:', bucketError.message);
    } else if (buckets) {
      console.log('   Found buckets:', buckets.map(b => b.name).join(', '));
    }

    // Test markdown-files bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('markdown-files')
      .list('', { limit: 10 });
    
    if (filesError) {
      console.log('   ❌ markdown-files access error:', filesError.message);
    } else if (files && files.length > 0) {
      console.log(`   ✓ markdown-files bucket accessible`);
      console.log(`   Found ${files.length} items in root`);
      console.log('   Sample items:', files.slice(0, 3).map(f => f.name).join(', '));
      
      // Check specific paths
      const testPaths = ['2021', 'FY2021', 'FY2016', '2020'];
      for (const path of testPaths) {
        const { data: pathData } = await supabase.storage
          .from('markdown-files')
          .list(path, { limit: 1 });
        
        if (pathData && pathData.length > 0) {
          console.log(`   ✓ Path exists: ${path}`);
        }
      }
    } else {
      console.log('   ⚠️ markdown-files bucket is empty or not accessible');
    }

  } catch (err) {
    console.log('   Storage test error:', err.message);
  }

  console.log('');

  // Test 3: Public URL Generation
  console.log('3. Testing Public URL Access...');
  try {
    const testFile = 'test.md';
    const { data: urlData } = supabase.storage
      .from('markdown-files')
      .getPublicUrl(testFile);
    
    if (urlData) {
      console.log('   Public URL format:', urlData.publicUrl.substring(0, 80) + '...');
    }
  } catch (err) {
    console.log('   Public URL test error:', err.message);
  }

  console.log('');

  // Test 4: Search for specific company
  console.log('4. Searching for specific companies...');
  const testCompanyIds = ['S100LJ4F', 'S100L3K4', 'S1000012'];
  
  for (const companyId of testCompanyIds) {
    console.log(`   Searching for ${companyId}...`);
    
    // Try different path patterns
    const patterns = [
      companyId,
      `2021/${companyId}`,
      `FY2021/${companyId}`,
      `2020/${companyId}`,
      `FY2016/${companyId}`
    ];
    
    for (const pattern of patterns) {
      const { data, error } = await supabase.storage
        .from('markdown-files')
        .list(pattern, { limit: 1 });
      
      if (data && data.length > 0) {
        console.log(`   ✓ Found at: ${pattern}`);
        break;
      }
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('Test complete');
}

testConnection().catch(console.error);