#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zxzyidqrvzfzhicfuhlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns'
);

console.log('トヨタ関連企業検索テスト');
console.log('='.repeat(50));

// トヨタを検索
const { data, error } = await supabase
  .from('companies')
  .select('id, name, ticker')
  .or('name.ilike.%トヨタ%')
  .limit(10);

if (error) {
  console.log('Error:', error.message);
} else if (data && data.length > 0) {
  console.log(`\n見つかった企業: ${data.length}件\n`);
  data.forEach(c => {
    console.log(`ID: ${c.id}`);
    console.log(`名前: ${c.name}`);
    console.log(`Ticker: ${c.ticker || 'N/A'}`);
    console.log('-'.repeat(30));
  });
} else {
  console.log('トヨタ関連企業が見つかりませんでした');
}

// トヨタ自動車の正確なIDを探す
console.log('\n「トヨタ自動車」を検索...');
const { data: toyota } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', 'トヨタ自動車株式会社')
  .single();

if (toyota) {
  console.log(`\nトヨタ自動車株式会社のID: ${toyota.id}`);
  
  // Storageでドキュメントを確認
  console.log('\nStorageのドキュメントを確認中...');
  
  const paths = [
    `2021/${toyota.id}`,
    `2022/${toyota.id}`,
    `FY2024/${toyota.id}`,
    `FY2025/${toyota.id}`
  ];
  
  for (const path of paths) {
    const { data: files } = await supabase.storage
      .from('markdown-files')
      .list(path, { limit: 1 });
    
    if (files && files.length > 0) {
      console.log(`✓ Found documents at: ${path}`);
    }
  }
}