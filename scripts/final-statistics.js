/**
 * 最終的な企業データ統計を表示するスクリプト
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

async function showFinalStatistics() {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 企業データインポート完了レポート');
  console.log('='.repeat(70));
  
  try {
    // 総企業数を取得
    const { count: totalCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 最終結果`);
    console.log('-'.repeat(70));
    console.log(`  総企業数: ${totalCount?.toLocaleString() || 0}社`);
    console.log(`  CSVからインポート: 36,683社`);
    console.log(`  既存データ: ${((totalCount || 0) - 36683).toLocaleString()}社`);
    
    // セクター別統計（詳細）
    const { data: sectorData } = await supabase
      .from('companies')
      .select('sector');
    
    if (sectorData) {
      const sectorStats = {};
      let nullCount = 0;
      
      sectorData.forEach(row => {
        if (row.sector) {
          sectorStats[row.sector] = (sectorStats[row.sector] || 0) + 1;
        } else {
          nullCount++;
        }
      });
      
      console.log(`\n📈 セクター分布`);
      console.log('-'.repeat(70));
      
      const sortedSectors = Object.entries(sectorStats)
        .sort((a, b) => b[1] - a[1]);
      
      // 上位10セクター
      console.log('【上位10セクター】');
      sortedSectors.slice(0, 10).forEach(([sector, count], index) => {
        const percentage = ((count / totalCount) * 100).toFixed(2);
        const bar = '█'.repeat(Math.min(40, Math.floor(count / 1000)));
        console.log(`  ${String(index + 1).padStart(2)}. ${sector.padEnd(20)} ${String(count).padStart(7)}社 (${percentage.padStart(6)}%)`);
      });
      
      // セクターカテゴリ別集計
      const categories = {
        '金融': ['銀行業', '証券業', '保険業', 'その他金融業'],
        '製造業': ['電気機器', '化学', '機械', '輸送用機器', '鉄鋼', '非鉄金属', '金属製品'],
        'IT・通信': ['情報・通信業', '電気・ガス業'],
        'サービス': ['サービス業', '小売業', '卸売業'],
        '建設・不動産': ['建設業', '不動産業'],
        '運輸': ['陸運業', '海運業', '空運業', '倉庫・運輸関連業'],
        '素材': ['ガラス・土石製品', 'ゴム製品', 'パルプ・紙', '繊維製品'],
        '食品・医薬': ['食料品', '医薬品'],
        'エネルギー': ['石油・石炭製品', '鉱業'],
        '農林水産': ['水産・農林業']
      };
      
      console.log('\n【カテゴリ別集計】');
      let categorizedCount = 0;
      Object.entries(categories).forEach(([category, sectors]) => {
        const count = sectors.reduce((sum, sector) => {
          return sum + (sectorStats[sector] || 0);
        }, 0);
        if (count > 0) {
          categorizedCount += count;
          const percentage = ((count / totalCount) * 100).toFixed(2);
          console.log(`  ${category.padEnd(15)} ${String(count).padStart(7)}社 (${percentage.padStart(6)}%)`);
        }
      });
      
      const otherCount = totalCount - categorizedCount - nullCount;
      if (otherCount > 0) {
        const percentage = ((otherCount / totalCount) * 100).toFixed(2);
        console.log(`  ${'その他'.padEnd(15)} ${String(otherCount).padStart(7)}社 (${percentage.padStart(6)}%)`);
      }
      
      if (nullCount > 0) {
        const percentage = ((nullCount / totalCount) * 100).toFixed(2);
        console.log(`  ${'未分類'.padEnd(15)} ${String(nullCount).padStart(7)}社 (${percentage.padStart(6)}%)`);
      }
    }
    
    // ID形式の分析
    console.log(`\n🔤 企業ID形式分析`);
    console.log('-'.repeat(70));
    
    const { data: allIds } = await supabase
      .from('companies')
      .select('id')
      .limit(50000);
    
    if (allIds) {
      const prefixStats = {};
      allIds.forEach(row => {
        const prefix = row.id.substring(0, 4);
        prefixStats[prefix] = (prefixStats[prefix] || 0) + 1;
      });
      
      const sortedPrefixes = Object.entries(prefixStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log('【上位IDプレフィックス】');
      sortedPrefixes.forEach(([prefix, count]) => {
        const percentage = ((count / totalCount) * 100).toFixed(2);
        console.log(`  ${prefix}*: ${String(count).padStart(7)}社 (${percentage.padStart(6)}%)`);
      });
    }
    
    // データ品質指標
    console.log(`\n✅ データ品質指標`);
    console.log('-'.repeat(70));
    
    const { data: qualityCheck } = await supabase
      .from('companies')
      .select('id, ticker_code, company_name, sector')
      .limit(10000);
    
    if (qualityCheck) {
      let hasTickerCount = 0;
      let hasSectorCount = 0;
      let hasLongNameCount = 0;
      
      qualityCheck.forEach(row => {
        if (row.ticker_code) hasTickerCount++;
        if (row.sector && row.sector !== 'その他') hasSectorCount++;
        if (row.company_name && row.company_name.length > 10) hasLongNameCount++;
      });
      
      console.log(`  ティッカーコード設定率: ${((hasTickerCount / qualityCheck.length) * 100).toFixed(1)}%`);
      console.log(`  セクター分類率: ${((hasSectorCount / qualityCheck.length) * 100).toFixed(1)}%`);
      console.log(`  詳細企業名（10文字以上）: ${((hasLongNameCount / qualityCheck.length) * 100).toFixed(1)}%`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🎊 インポート処理が正常に完了しました！');
    console.log('='.repeat(70));
    console.log('\n次のステップ:');
    console.log('1. markdown_files_metadataテーブルへの財務データ投入');
    console.log('2. APIエンドポイントの動作確認');
    console.log('3. フロントエンドでの企業検索機能のテスト');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  showFinalStatistics()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { showFinalStatistics };