/**
 * CSVから企業データをインポートするスクリプト
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CSVファイルのパス
const CSV_FILE_PATH = 'C:\\Users\\pumpk\\Downloads\\2025-09-01T11-24_export.csv';

// セクターのマッピング（企業名から推測）
function guessSector(companyName) {
  if (companyName.includes('銀行')) return '銀行業';
  if (companyName.includes('証券')) return '証券業';
  if (companyName.includes('保険')) return '保険業';
  if (companyName.includes('不動産')) return '不動産業';
  if (companyName.includes('建設')) return '建設業';
  if (companyName.includes('電機') || companyName.includes('電気')) return '電気機器';
  if (companyName.includes('自動車')) return '輸送用機器';
  if (companyName.includes('鉄道')) return '陸運業';
  if (companyName.includes('海運') || companyName.includes('船')) return '海運業';
  if (companyName.includes('航空')) return '空運業';
  if (companyName.includes('製薬') || companyName.includes('薬品')) return '医薬品';
  if (companyName.includes('化学') || companyName.includes('化成')) return '化学';
  if (companyName.includes('食品') || companyName.includes('製菓')) return '食料品';
  if (companyName.includes('鉄鋼')) return '鉄鋼';
  if (companyName.includes('機械')) return '機械';
  if (companyName.includes('商事') || companyName.includes('商社')) return '卸売業';
  if (companyName.includes('百貨店') || companyName.includes('ストア')) return '小売業';
  if (companyName.includes('ホテル') || companyName.includes('旅館')) return 'サービス業';
  if (companyName.includes('ソフト') || companyName.includes('システム')) return '情報・通信業';
  if (companyName.includes('ガラス') || companyName.includes('セメント')) return 'ガラス・土石製品';
  if (companyName.includes('ゴム')) return 'ゴム製品';
  if (companyName.includes('繊維')) return '繊維製品';
  if (companyName.includes('紙') || companyName.includes('パルプ')) return 'パルプ・紙';
  if (companyName.includes('電力')) return '電気・ガス業';
  if (companyName.includes('ガス')) return '電気・ガス業';
  if (companyName.includes('石油')) return '石油・石炭製品';
  if (companyName.includes('印刷')) return 'その他製品';
  if (companyName.includes('精密')) return '精密機器';
  if (companyName.includes('金属')) return '非鉄金属';
  if (companyName.includes('倉庫')) return '倉庫・運輸関連業';
  if (companyName.includes('通信')) return '情報・通信業';
  if (companyName.includes('メディア') || companyName.includes('放送')) return '情報・通信業';
  if (companyName.includes('農') || companyName.includes('林') || companyName.includes('水産')) return '水産・農林業';
  if (companyName.includes('鉱業')) return '鉱業';
  return 'その他';
}

// ティッカーコードを生成（docIDから）
function generateTickerCode(docId, index) {
  // docIDのハッシュ値から4桁の数字を生成
  let hash = 0;
  for (let i = 0; i < docId.length; i++) {
    hash = ((hash << 5) - hash) + docId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash % 9000 + 1000).toString();
}

async function importCompanies() {
  console.log('🚀 CSV企業データのインポートを開始します...');
  
  try {
    // CSVファイルを読み込み
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split('\n');
    
    console.log(`📄 CSVファイル読み込み完了: ${lines.length}行`);
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    // ユニークな企業を抽出
    const companiesMap = new Map();
    
    dataLines.forEach((line, index) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const docId = parts[0].trim();
        const companyName = parts[1].trim().replace(/^"|"$/g, ''); // クォートを除去
        
        if (docId && companyName && !companiesMap.has(docId)) {
          companiesMap.set(docId, {
            id: docId,
            ticker_code: generateTickerCode(docId, index),
            company_name: companyName,
            sector: guessSector(companyName)
          });
        }
      }
    });
    
    console.log(`👥 ユニークな企業数: ${companiesMap.size}`);
    
    // バッチで挿入（100件ずつ）
    const companies = Array.from(companiesMap.values());
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('companies')
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ バッチ ${i / batchSize + 1} エラー:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ バッチ ${i / batchSize + 1}: ${batch.length}件追加`);
      }
      
      // レート制限対策
      if (i % 1000 === 0 && i > 0) {
        console.log(`⏸️ 一時停止... (${i}/${companies.length})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n📊 インポート完了:');
    console.log(`  成功: ${successCount}件`);
    console.log(`  エラー: ${errorCount}件`);
    
    // 最終的な企業数を確認
    const { count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🏢 データベース内の総企業数: ${count}社`);
    
  } catch (error) {
    console.error('❌ インポートエラー:', error);
  }
}

// 実行
if (require.main === module) {
  importCompanies()
    .then(() => {
      console.log('✅ インポート完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { importCompanies };