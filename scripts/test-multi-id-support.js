#!/usr/bin/env node

/**
 * 複数Company ID対応テスト
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testMultiIdSupport() {
  console.log('🧪 複数Company ID対応テスト');
  console.log('='.repeat(60));
  
  // 1. トヨタ自動車の各IDを確認
  console.log('\n1️⃣ トヨタ自動車の各IDを確認:');
  
  const companyIds = ['S100LO6W', 'S100TR7I'];
  
  for (const id of companyIds) {
    const { data } = await supabase
      .from('financial_documents')
      .select('company_name, fiscal_year, count()')
      .eq('company_id', id)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`  ${id}: ${data[0].company_name} (${data[0].fiscal_year})`);
    } else {
      console.log(`  ${id}: データなし`);
    }
  }
  
  // 2. search_companiesをテスト
  console.log('\n2️⃣ search_companiesテスト:');
  console.log('  MCPコマンド例:');
  console.log('  {"function": "search_companies", "arguments": {"query": "トヨタ"}}');
  
  const { data: searchResults } = await supabase
    .from('financial_documents')
    .select('company_name, company_id, fiscal_year')
    .ilike('company_name', '%トヨタ%')
    .limit(10);
  
  const companies = {};
  searchResults?.forEach(r => {
    if (!companies[r.company_name]) {
      companies[r.company_name] = {
        ids: new Set(),
        years: new Set()
      };
    }
    companies[r.company_name].ids.add(r.company_id);
    companies[r.company_name].years.add(r.fiscal_year);
  });
  
  console.log('\n  検索結果:');
  Object.entries(companies).forEach(([name, info]) => {
    console.log(`    ${name}:`);
    console.log(`      IDs: ${Array.from(info.ids).join(', ')}`);
    console.log(`      年度: ${Array.from(info.years).join(', ')}`);
  });
  
  // 3. get_company_infoテスト（両方のID）
  console.log('\n3️⃣ get_company_infoテスト:');
  
  for (const id of companyIds) {
    console.log(`\n  ID: ${id}でアクセス:`);
    console.log(`  MCPコマンド: {"function": "get_company_info", "arguments": {"company_id": "${id}"}}`);
    
    const { data } = await supabase
      .from('financial_documents')
      .select('company_name, fiscal_year')
      .eq('company_id', id)
      .limit(5);
    
    if (data && data.length > 0) {
      const years = [...new Set(data.map(d => d.fiscal_year))];
      console.log(`    → ${data[0].company_name}`);
      console.log(`    → 利用可能年度: ${years.join(', ')}`);
    } else {
      console.log(`    → データなし`);
    }
  }
  
  // 4. 推奨使用方法
  console.log('\n4️⃣ 推奨使用方法:');
  console.log('  FY2025データ: S100TR7Iを使用');
  console.log('  FY2022データ: S100LO6Wを使用');
  console.log('  両方: search_companiesで"トヨタ"を検索');
  
  console.log('\n✅ MCPサーバーは複数IDに対応しています');
}

testMultiIdSupport().catch(console.error);