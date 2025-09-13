/**
 * CSVファイルから企業データを読み込み、SQL INSERT文を生成するスクリプト
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CSVファイルのパス
const CSV_FILE = 'C:\\Users\\pumpk\\Downloads\\2025-09-01T11-24_export.csv';
const OUTPUT_DIR = path.join(__dirname, 'sql-inserts');

// セクターのマッピング
function guessSector(companyName) {
  if (companyName.includes('銀行')) return '銀行業';
  if (companyName.includes('証券')) return '証券業';
  if (companyName.includes('保険')) return '保険業';
  if (companyName.includes('不動産')) return '不動産業';
  if (companyName.includes('建設') || companyName.includes('建築')) return '建設業';
  if (companyName.includes('電機') || companyName.includes('電気') || companyName.includes('電子')) return '電気機器';
  if (companyName.includes('自動車') || companyName.includes('モーター')) return '輸送用機器';
  if (companyName.includes('鉄道') || companyName.includes('旅客')) return '陸運業';
  if (companyName.includes('海運') || companyName.includes('船')) return '海運業';
  if (companyName.includes('航空') || companyName.includes('エアライン')) return '空運業';
  if (companyName.includes('製薬') || companyName.includes('薬品') || companyName.includes('薬局')) return '医薬品';
  if (companyName.includes('化学') || companyName.includes('化成')) return '化学';
  if (companyName.includes('食品') || companyName.includes('製菓') || companyName.includes('飲料')) return '食料品';
  if (companyName.includes('鉄鋼') || companyName.includes('製鉄')) return '鉄鋼';
  if (companyName.includes('機械') || companyName.includes('機器')) return '機械';
  if (companyName.includes('商事') || companyName.includes('商社') || companyName.includes('商業')) return '卸売業';
  if (companyName.includes('百貨店') || companyName.includes('ストア') || companyName.includes('マート')) return '小売業';
  if (companyName.includes('ホテル') || companyName.includes('旅館') || companyName.includes('リゾート')) return 'サービス業';
  if (companyName.includes('ソフト') || companyName.includes('システム') || companyName.includes('IT')) return '情報・通信業';
  if (companyName.includes('ガラス') || companyName.includes('セメント')) return 'ガラス・土石製品';
  if (companyName.includes('ゴム')) return 'ゴム製品';
  if (companyName.includes('繊維') || companyName.includes('テキスタイル')) return '繊維製品';
  if (companyName.includes('紙') || companyName.includes('パルプ')) return 'パルプ・紙';
  if (companyName.includes('電力')) return '電気・ガス業';
  if (companyName.includes('ガス')) return '電気・ガス業';
  if (companyName.includes('石油') || companyName.includes('エネルギー')) return '石油・石炭製品';
  if (companyName.includes('印刷')) return 'その他製品';
  if (companyName.includes('精密')) return '精密機器';
  if (companyName.includes('金属')) return '非鉄金属';
  if (companyName.includes('倉庫') || companyName.includes('物流')) return '倉庫・運輸関連業';
  if (companyName.includes('通信') || companyName.includes('テレコム')) return '情報・通信業';
  if (companyName.includes('メディア') || companyName.includes('放送') || companyName.includes('テレビ')) return '情報・通信業';
  if (companyName.includes('農') || companyName.includes('林') || companyName.includes('水産')) return '水産・農林業';
  if (companyName.includes('鉱業') || companyName.includes('鉱山')) return '鉱業';
  if (companyName.includes('サービス')) return 'サービス業';
  return 'その他';
}

// ティッカーコードを生成
function generateTicker(docId, index) {
  // docIdのハッシュ値から4桁の数字を生成
  const hash = crypto.createHash('md5').update(docId).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16) % 9000 + 1000;
  return num.toString();
}

// SQLインジェクション対策のためエスケープ
function escapeSqlString(s) {
  if (!s) return '';
  // シングルクォートをエスケープ
  return s.replace(/'/g, "''");
}

function main() {
  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('📄 CSVファイル読み込み中...');
  
  // CSVファイル読み込み
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = csvContent.split('\n');
  
  console.log(`総行数: ${lines.length}`);
  
  // ヘッダーをスキップし、データ行を処理
  const companies = new Map();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // カンマ区切りで分割（ただし、引用符内のカンマは無視）
    const parts = line.match(/(".*?"|[^,]+)/g) || [];
    
    if (parts.length >= 2) {
      const docId = parts[0].replace(/"/g, '').trim();
      const companyName = parts[1].replace(/"/g, '').trim();
      
      // IDの妥当性チェック
      if (docId && companyName && !companies.has(docId)) {
        companies.set(docId, {
          name: companyName,
          ticker: generateTicker(docId, companies.size),
          sector: guessSector(companyName)
        });
      }
    }
  }
  
  console.log(`✅ ユニークな企業数: ${companies.size}`);
  
  // 1000社ずつのバッチに分割してSQL生成
  const batchSize = 1000;
  const companyEntries = Array.from(companies.entries());
  let totalBatches = Math.ceil(companyEntries.length / batchSize);
  
  console.log(`📝 SQLファイル生成中... (${totalBatches}バッチ)`);
  
  for (let batchNum = 0; batchNum < companyEntries.length; batchNum += batchSize) {
    const batch = companyEntries.slice(batchNum, Math.min(batchNum + batchSize, companyEntries.length));
    const batchIndex = Math.floor(batchNum / batchSize) + 1;
    
    const outputFile = path.join(OUTPUT_DIR, `insert_companies_batch_${String(batchIndex).padStart(3, '0')}.sql`);
    
    let sql = `-- 企業データ挿入 バッチ ${batchIndex}/${totalBatches}\n`;
    sql += `-- 企業数: ${batch.length}\n\n`;
    sql += `INSERT INTO companies (id, ticker_code, company_name, sector) VALUES\n`;
    
    const values = batch.map(([docId, info]) => {
      const nameEscaped = escapeSqlString(info.name);
      return `  ('${docId}', '${info.ticker}', '${nameEscaped}', '${info.sector}')`;
    });
    
    sql += values.join(',\n');
    sql += '\nON CONFLICT (id) DO UPDATE SET\n';
    sql += '  company_name = EXCLUDED.company_name,\n';
    sql += '  ticker_code = EXCLUDED.ticker_code,\n';
    sql += '  sector = EXCLUDED.sector;\n';
    
    fs.writeFileSync(outputFile, sql, 'utf-8');
    console.log(`  ✅ バッチ ${batchIndex}: ${batch.length}社 -> ${outputFile}`);
  }
  
  // 統計サマリーファイルを生成
  const summaryFile = path.join(OUTPUT_DIR, '00_summary.txt');
  const sectorStats = {};
  companies.forEach(info => {
    sectorStats[info.sector] = (sectorStats[info.sector] || 0) + 1;
  });
  
  let summary = `===========================================\n`;
  summary += `CSVからのSQL生成完了\n`;
  summary += `===========================================\n\n`;
  summary += `総企業数: ${companies.size}社\n`;
  summary += `生成SQLファイル数: ${totalBatches}個\n\n`;
  summary += `セクター別統計:\n`;
  summary += `-------------------------------------------\n`;
  
  Object.entries(sectorStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sector, count]) => {
      summary += `  ${sector}: ${count}社\n`;
    });
  
  summary += `\n===========================================\n`;
  summary += `\n実行方法:\n`;
  summary += `1. Supabase SQLエディタを開く\n`;
  summary += `2. 各SQLファイルの内容をコピー&ペースト\n`;
  summary += `3. 順番に実行（バッチ001から順に）\n`;
  
  fs.writeFileSync(summaryFile, summary, 'utf-8');
  
  console.log('\n' + summary);
  console.log(`\n✅ 完了! SQLファイルは ${OUTPUT_DIR} に保存されました。`);
}

// 実行
main();