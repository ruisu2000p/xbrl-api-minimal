#!/usr/bin/env node

/**
 * 現在のMCPサーバーの動作を確認
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testMCPDataAccess() {
  console.log('🧪 現在のMCPサーバーのデータアクセスをテスト');
  console.log('='.repeat(60));
  
  // 1. トヨタ自動車のデータを確認
  console.log('\n1️⃣ トヨタ自動車のデータ状況:');
  
  // financial_documentsテーブルから検索
  const { data: toyotaDocs } = await supabase
    .from('financial_documents')
    .select('company_name, company_id, fiscal_year, count()')
    .ilike('company_name', '%トヨタ自動車%')
    .order('fiscal_year', { ascending: false });
  
  const yearMap = {};
  toyotaDocs?.forEach(doc => {
    const key = `${doc.fiscal_year}_${doc.company_id}`;
    if (!yearMap[key]) {
      yearMap[key] = {
        year: doc.fiscal_year,
        company_id: doc.company_id,
        company_name: doc.company_name,
        count: 0
      };
    }
    yearMap[key].count++;
  });
  
  console.log('\n📊 データベース内のトヨタデータ:');
  Object.values(yearMap).forEach(item => {
    console.log(`  ${item.year}: ${item.company_id} - ${item.count}ファイル`);
  });
  
  // 2. Storage内の実際のファイルを確認
  console.log('\n2️⃣ Storage内の実際のファイル:');
  
  const paths = [
    { path: 'FY2025/S100TR7I', desc: 'FY2025 (新ID)' },
    { path: 'FY2022/S100LO6W', desc: 'FY2022 (旧ID)' },
    { path: '2021/S100LO6W', desc: '2021年' },
    { path: '2022/S100LO6W', desc: '2022年' }
  ];
  
  for (const { path, desc } of paths) {
    const { data: folders } = await supabase.storage
      .from('markdown-files')
      .list(path, { limit: 10 });
    
    if (folders && folders.length > 0) {
      const subfolders = folders.filter(f => !f.name.includes('.'));
      let totalFiles = 0;
      
      for (const folder of subfolders) {
        const { data: files } = await supabase.storage
          .from('markdown-files')
          .list(`${path}/${folder.name}`, { limit: 100 });
        const mdFiles = files?.filter(f => f.name.endsWith('.md')) || [];
        totalFiles += mdFiles.length;
      }
      
      console.log(`  ✅ ${desc}: ${path}`);
      console.log(`     フォルダ: ${subfolders.map(f => f.name).join(', ')}`);
      console.log(`     ファイル数: ${totalFiles}`);
    } else {
      console.log(`  ❌ ${desc}: データなし`);
    }
  }
  
  // 3. MCPサーバーでの呼び出し方法
  console.log('\n3️⃣ MCPサーバーでの正しい呼び出し方:');
  console.log('\n🔵 検索コマンド:');
  console.log('  {"function": "search_companies", "arguments": {"query": "トヨタ"}}');
  
  console.log('\n🔵 FY2025データ取得:');
  console.log('  {"function": "get_company_info", "arguments": {"company_id": "S100TR7I"}}');
  console.log('  {"function": "list_documents", "arguments": {"company_id": "S100TR7I", "year": "FY2025"}}');
  
  console.log('\n🔵 FY2022データ取得:');
  console.log('  {"function": "get_company_info", "arguments": {"company_id": "S100LO6W"}}');
  console.log('  {"function": "list_documents", "arguments": {"company_id": "S100LO6W", "year": "FY2022"}}');
  
  // 4. 問題点の確認
  console.log('\n4️⃣ 問題点の確認:');
  
  // companiesテーブルにトヨタがあるか
  const { data: companiesData } = await supabase
    .from('companies')
    .select('id, name, has_data')
    .or('id.eq.S100TR7I,id.eq.S100LO6W,name.ilike.%トヨタ%');
  
  if (companiesData && companiesData.length > 0) {
    console.log('  ✅ companiesテーブルにトヨタデータあり:');
    companiesData.forEach(c => {
      console.log(`     ${c.id}: ${c.name} (has_data: ${c.has_data})`);
    });
  } else {
    console.log('  ⚠️ companiesテーブルにトヨタデータなし');
    console.log('  → MCPサーバーはfinancial_documentsテーブルからフォールバックします');
  }
  
  console.log('\n✨ テスト完了');
}

testMCPDataAccess().catch(console.error);