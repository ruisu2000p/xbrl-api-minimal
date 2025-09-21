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

async function testFileContent() {
  console.log('=================================================');
  console.log('XBRL Financial API - ファイル内容取得テスト');
  console.log('=================================================\n');

  try {
    // Step 1: トヨタ自動車のファイルを取得
    console.log('【ステップ1】トヨタ自動車の財務ファイル検索');
    console.log('-------------------------------------------------');

    const filesResponse = await makeRequest('/markdown-files?company_id=S100TR7I&fiscal_year=FY2024&limit=1');

    if (filesResponse.ok) {
      const filesData = JSON.parse(filesResponse.data);
      console.log('✅ ファイル取得成功！');
      console.log('ファイル数:', filesData.data?.length || 0, '件');

      if (filesData.data && filesData.data.length > 0) {
        const file = filesData.data[0];
        console.log('\n取得したファイル情報:');
        console.log('  • ファイル名:', file.file_name || 'ファイル名なし');
        console.log('  • タイプ:', file.file_type);
        console.log('  • 企業名:', file.company_name);
        console.log('  • ストレージパス:', file.storage_path);

        console.log('\n【ステップ2】ファイル内容の取得（直接Storageから）');
        console.log('-------------------------------------------------');

        // storage_pathからファイルの内容を直接取得
        const cleanPath = file.storage_path.startsWith('markdown-files/markdown-files/')
          ? file.storage_path.replace('markdown-files/markdown-files/', 'markdown-files/')
          : file.storage_path;

        const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${cleanPath}`;
        console.log('  • アクセスURL:', fileUrl);

        // HTTPSでファイル内容を取得
        const fileContentResponse = await new Promise((resolve, reject) => {
          https.get(fileUrl, (res) => {
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
          }).on('error', reject);
        });

        if (fileContentResponse.ok) {
          console.log('✅ ファイル内容取得成功！');
          console.log('  • ファイルサイズ:', fileContentResponse.data.length, 'バイト');

          // 最初の500文字を表示
          console.log('\n【ファイル内容（最初の500文字）】');
          console.log('-------------------------------------------------');
          console.log(fileContentResponse.data.substring(0, 500));
          console.log('...\n');

          // 行数をカウント
          const lines = fileContentResponse.data.split('\n');
          console.log('  • 総行数:', lines.length, '行');

          // Markdownの見出しを抽出
          const headings = lines.filter(line => line.match(/^#+\s/));
          if (headings.length > 0) {
            console.log('\n【見出し構造（最初の10個）】');
            console.log('-------------------------------------------------');
            headings.slice(0, 10).forEach(heading => {
              const level = heading.match(/^#+/)[0].length;
              const indent = '  '.repeat(level - 1);
              const text = heading.replace(/^#+\s/, '');
              console.log(`${indent}${'#'.repeat(level)} ${text}`);
            });
          }

        } else {
          console.log('❌ ファイル内容取得失敗:', fileContentResponse.status);
        }

      } else {
        console.log('ファイルが見つかりませんでした');
      }
    } else {
      console.log('❌ ファイル検索失敗:', filesResponse.data);
    }

  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n=================================================');
  console.log('テスト完了');
  console.log('=================================================');
}

// 実行
testFileContent();