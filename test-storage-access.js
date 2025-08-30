#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageAccess() {
  console.log('📊 Storage Access Test\n');
  
  // 1. 各年度のフォルダをチェック
  const years = [
    'FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019',
    'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025',
    '2020', '2021', '2022'
  ];
  
  console.log('📅 年度別データチェック:');
  for (const year of years) {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .list(year, { limit: 1 });
    
    if (data && data.length > 0) {
      // さらに深く探索して企業数をカウント
      const { data: companies } = await supabase.storage
        .from('markdown-files')
        .list(year, { limit: 1000 });
      
      const companyCount = companies ? companies.filter(item => !item.name.includes('.')).length : 0;
      console.log(`  ✅ ${year}: ${companyCount}社`);
    } else {
      console.log(`  ❌ ${year}: データなし`);
    }
  }
  
  // 2. 現在のリンク状況
  const { count } = await supabase
    .from('company_storage_links')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📈 現在のリンク数: ${count}`);
  
  // 3. 年度別リンク状況
  const { data: yearStats } = await supabase
    .from('v_fiscal_year_stats')
    .select('*')
    .order('fiscal_year');
  
  if (yearStats && yearStats.length > 0) {
    console.log('\n📊 リンク済み統計:');
    yearStats.forEach(stat => {
      console.log(`  ${stat.fiscal_year}: ${stat.company_count}社, ${stat.file_count}ファイル`);
      if (stat.public_doc_companies > 0 || stat.audit_doc_companies > 0) {
        console.log(`    - Public: ${stat.public_doc_companies}社, Audit: ${stat.audit_doc_companies}社`);
      }
    });
  }
}

testStorageAccess().catch(console.error);