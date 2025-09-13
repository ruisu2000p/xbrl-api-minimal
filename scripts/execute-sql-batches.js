/**
 * SQLバッチファイルを順番に実行するスクリプト
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

// SQLファイルディレクトリ
const SQL_DIR = path.join(__dirname, 'sql-inserts');

async function executeSqlBatches() {
  console.log('🚀 SQLバッチ実行を開始します...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  try {
    // 既存の企業数を確認
    const { count: beforeCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 実行前の企業数: ${beforeCount || 0}社`);
    
    // SQLファイルをリストアップ
    const sqlFiles = fs.readdirSync(SQL_DIR)
      .filter(file => file.startsWith('insert_companies_batch_') && file.endsWith('.sql'))
      .sort();
    
    console.log(`\n📁 ${sqlFiles.length}個のSQLファイルが見つかりました`);
    
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 各SQLファイルを実行
    for (const [index, sqlFile] of sqlFiles.entries()) {
      const filePath = path.join(SQL_DIR, sqlFile);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      // SQL文から企業数を抽出
      const companyCountMatch = sql.match(/-- 企業数: (\d+)/);
      const companyCount = companyCountMatch ? parseInt(companyCountMatch[1]) : 0;
      
      console.log(`\n⏳ バッチ ${index + 1}/${sqlFiles.length}: ${sqlFile} (${companyCount}社)`);
      
      // VALUES句を分割して個別に実行
      const valuesMatch = sql.match(/VALUES\s*([\s\S]*?)\s*ON CONFLICT/);
      let error = null;
      
      if (valuesMatch) {
        const valuesStr = valuesMatch[1];
        const rows = valuesStr.split(/\),\s*\(/);
        
        const companies = rows.map(row => {
          // 括弧を削除してクリーンアップ
          const cleanRow = row.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
          // 正規表現を改善してエスケープされたシングルクォートに対応
          const parts = cleanRow.match(/'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'/);
          
          if (parts) {
            return {
              id: parts[1],
              ticker_code: parts[2],
              company_name: parts[3].replace(/''/g, "'"), // エスケープされたシングルクォートを戻す
              sector: parts[4]
            };
          }
          return null;
        }).filter(Boolean);
        
        // バッチで挿入
        const { error: insertError } = await supabase
          .from('companies')
          .upsert(companies, { onConflict: 'id' });
        
        error = insertError;
      } else {
        error = new Error('SQLパースエラー');
      }
      
      if (error) {
        console.error(`  ❌ エラー: ${error.message}`);
        errorCount += companyCount;
      } else {
        console.log(`  ✅ 成功`);
        successCount += companyCount;
      }
      
      totalProcessed += companyCount;
      
      // レート制限対策（10バッチごとに一時停止）
      if ((index + 1) % 10 === 0 && index < sqlFiles.length - 1) {
        console.log(`\n⏸️ 一時停止中... (${totalProcessed}/${36683}社処理済み)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 最終的な企業数を確認
    const { count: afterCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 実行完了サマリー:');
    console.log('='.repeat(50));
    console.log(`  処理対象: ${totalProcessed}社`);
    console.log(`  成功: ${successCount}社`);
    console.log(`  エラー: ${errorCount}社`);
    console.log(`  実行前の企業数: ${beforeCount || 0}社`);
    console.log(`  実行後の企業数: ${afterCount || 0}社`);
    console.log(`  新規追加: ${(afterCount || 0) - (beforeCount || 0)}社`);
    console.log('='.repeat(50));
    
    // セクター別統計を取得
    const { data: sectorStats } = await supabase
      .from('companies')
      .select('sector')
      .order('sector');
    
    if (sectorStats) {
      const sectorCounts = {};
      sectorStats.forEach(row => {
        sectorCounts[row.sector] = (sectorCounts[row.sector] || 0) + 1;
      });
      
      console.log('\n📈 セクター別企業数:');
      Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([sector, count]) => {
          console.log(`  ${sector}: ${count}社`);
        });
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

// 実行
if (require.main === module) {
  executeSqlBatches()
    .then(() => {
      console.log('\n✅ スクリプト完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ スクリプトエラー:', error);
      process.exit(1);
    });
}

module.exports = { executeSqlBatches };