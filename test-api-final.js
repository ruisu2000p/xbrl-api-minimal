#!/usr/bin/env node

const https = require('https');

// API設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const XBRL_API_KEY = 'xbrl_v1_c1tq34z9bcoic0z8zvy6i5r2vdccpgnv';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/api-proxy${path}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-Api-Key': XBRL_API_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAPI() {
  console.log('=================================================');
  console.log('XBRL Financial API テスト');
  console.log('=================================================\n');

  // Test 1: APIの接続確認
  console.log('【テスト1】APIの接続確認');
  console.log('-------------------------------------------------');
  try {
    const response = await makeRequest('/markdown-files?limit=5');
    console.log('レスポンスステータス:', response.status);

    if (response.ok) {
      const data = JSON.parse(response.data);
      console.log('✅ API接続成功！');
      console.log('データ件数:', data.data?.length || 0, '件');
      console.log('アクセスティア:', data.tier || '不明');
    } else {
      console.log('❌ API接続失敗:', response.data);
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n');

  // Test 2: トヨタ自動車の検索
  console.log('【テスト2】トヨタ自動車の検索');
  console.log('-------------------------------------------------');
  try {
    const response = await makeRequest('/search-companies?query=' + encodeURIComponent('トヨタ自動車') + '&limit=10');
    console.log('レスポンスステータス:', response.status);

    if (response.ok) {
      const data = JSON.parse(response.data);
      console.log('✅ 検索成功！');
      console.log('見つかった企業数:', data.count || 0, '社');

      if (data.companies && data.companies.length > 0) {
        console.log('\n検索結果:');
        data.companies.forEach(company => {
          console.log(`  • ${company.company_name}`);
          console.log(`    企業ID: ${company.company_id}`);
          console.log(`    年度: ${company.fiscal_years.join(', ')}`);
        });
      } else {
        console.log('検索結果なし');
      }
    } else {
      console.log('❌ 検索失敗:', response.data);
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n');

  // Test 3: トヨタ自動車の財務ファイル取得
  console.log('【テスト3】トヨタ自動車の財務ファイル取得');
  console.log('-------------------------------------------------');
  try {
    // まずトヨタ自動車のcompany_idを取得
    const searchResponse = await makeRequest('/search-companies?query=' + encodeURIComponent('トヨタ自動車') + '&limit=1');

    if (searchResponse.ok) {
      const searchData = JSON.parse(searchResponse.data);

      if (searchData.companies && searchData.companies.length > 0) {
        const toyota = searchData.companies.find(c => c.company_name === 'トヨタ自動車株式会社') || searchData.companies[0];
        console.log(`検索で見つかった企業: ${toyota.company_name} (${toyota.company_id})`);

        // 財務ファイルを取得
        const filesResponse = await makeRequest('/markdown-files?company_id=' + toyota.company_id + '&fiscal_year=FY2024&limit=5');

        if (filesResponse.ok) {
          const filesData = JSON.parse(filesResponse.data);
          console.log('✅ ファイル取得成功！');
          console.log('ファイル数:', filesData.data?.length || 0, '件');

          if (filesData.data && filesData.data.length > 0) {
            console.log('\nファイル一覧:');
            filesData.data.slice(0, 3).forEach(file => {
              console.log(`  • ${file.file_name || 'ファイル名なし'}`);
              console.log(`    タイプ: ${file.file_type}`);
              console.log(`    パス: ${file.storage_path.substring(0, 80)}...`);
            });
          }
        } else {
          console.log('❌ ファイル取得失敗:', filesResponse.data);
        }
      } else {
        console.log('トヨタ自動車が見つかりませんでした');
      }
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n=================================================');
  console.log('テスト完了');
  console.log('=================================================');
}

// 実行
testAPI();