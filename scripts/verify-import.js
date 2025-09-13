/**
 * 企業データのインポート結果を確認するスクリプト
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyImport() {
  console.log('🔍 企業データのインポート結果を確認しています...\n');
  console.log('='.repeat(60));
  
  try {
    // 総企業数を取得
    const { count: totalCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 総企業数: ${totalCount?.toLocaleString() || 0}社`);
    console.log('='.repeat(60));
    
    // セクター別統計を取得
    const { data: sectorData } = await supabase
      .from('companies')
      .select('sector')
      .order('sector');
    
    if (sectorData) {
      const sectorStats = {};
      sectorData.forEach(row => {
        sectorStats[row.sector || 'null'] = (sectorStats[row.sector || 'null'] || 0) + 1;
      });
      
      console.log('\n📈 セクター別企業数（上位20）:');
      console.log('-'.repeat(60));
      
      const sortedSectors = Object.entries(sectorStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      
      sortedSectors.forEach(([sector, count], index) => {
        const percentage = ((count / totalCount) * 100).toFixed(2);
        const bar = '█'.repeat(Math.floor(count / 1000));
        console.log(`${String(index + 1).padStart(2)}. ${sector.padEnd(20)} ${String(count).padStart(6)}社 (${percentage.padStart(6)}%) ${bar}`);
      });
    }
    
    // サンプル企業を表示
    console.log('\n📝 最近追加された企業（サンプル10社）:');
    console.log('-'.repeat(60));
    
    const { data: sampleCompanies } = await supabase
      .from('companies')
      .select('id, ticker_code, company_name, sector')
      .order('id', { ascending: false })
      .limit(10);
    
    if (sampleCompanies) {
      sampleCompanies.forEach((company, index) => {
        console.log(`${index + 1}. [${company.id}] ${company.ticker_code} - ${company.company_name} (${company.sector})`);
      });
    }
    
    // IDの形式別統計
    console.log('\n🔤 ID形式別統計:');
    console.log('-'.repeat(60));
    
    const { data: idSamples } = await supabase
      .from('companies')
      .select('id')
      .limit(10000);
    
    if (idSamples) {
      const idPatterns = {
        'S100系': 0,
        'S10系': 0,
        'その他': 0
      };
      
      idSamples.forEach(row => {
        if (row.id.startsWith('S100')) {
          idPatterns['S100系']++;
        } else if (row.id.startsWith('S10')) {
          idPatterns['S10系']++;
        } else {
          idPatterns['その他']++;
        }
      });
      
      Object.entries(idPatterns).forEach(([pattern, count]) => {
        if (count > 0) {
          console.log(`  ${pattern}: ${count}社`);
        }
      });
    }
    
    // CSVとの比較
    console.log('\n📋 CSVファイルとの比較:');
    console.log('-'.repeat(60));
    console.log(`  CSV内の企業数: 36,683社`);
    console.log(`  DB内の企業数: ${totalCount?.toLocaleString() || 0}社`);
    
    if (totalCount) {
      if (totalCount >= 36683) {
        console.log(`  ✅ CSVのすべての企業が正常にインポートされました`);
      } else {
        const missing = 36683 - totalCount;
        console.log(`  ⚠️ ${missing}社がまだインポートされていません`);
      }
    }
    
    // 重複チェック
    console.log('\n🔍 データ品質チェック:');
    console.log('-'.repeat(60));
    
    // ティッカーコードの重複チェック
    const { data: tickerDupes } = await supabase
      .rpc('find_duplicate_tickers', {})
      .catch(() => null);
    
    if (tickerDupes === null) {
      // RPCが存在しない場合は手動でチェック
      const { data: allTickers } = await supabase
        .from('companies')
        .select('ticker_code')
        .limit(10000);
      
      if (allTickers) {
        const tickerCounts = {};
        allTickers.forEach(row => {
          if (row.ticker_code) {
            tickerCounts[row.ticker_code] = (tickerCounts[row.ticker_code] || 0) + 1;
          }
        });
        
        const duplicates = Object.entries(tickerCounts)
          .filter(([ticker, count]) => count > 1)
          .length;
        
        console.log(`  重複ティッカーコード: ${duplicates}個`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 確認完了！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  verifyImport()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { verifyImport };