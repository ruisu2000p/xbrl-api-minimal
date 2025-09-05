// 照合できなかったレコードを詳細に調査するスクリプト

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeUnmatchedRecords() {
  console.log('=== 照合できなかったレコードの分析 ===\n');

  try {
    // 1. 基本統計
    console.log('1. 基本統計:');
    
    // markdown_files_metadataの総数
    const { count: totalMetadata } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    console.log(`  markdown_files_metadata総数: ${totalMetadata}件`);

    // companiesの総数
    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    console.log(`  companies総数: ${totalCompanies}件`);
    console.log();

    // 2. 未照合のcompany_idを収集
    console.log('2. 未照合のcompany_idを分析中...');
    
    // markdown_files_metadataから全company_idを取得
    const metadataIds = new Set();
    let offset = 0;
    const limit = 10000;
    
    while (offset < totalMetadata) {
      const { data, error } = await supabase
        .from('markdown_files_metadata')
        .select('company_id')
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('  エラー:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      data.forEach(record => metadataIds.add(record.company_id));
      offset += limit;
      console.log(`  処理中: ${offset}/${totalMetadata}`);
    }
    
    console.log(`  ユニークなcompany_id: ${metadataIds.size}件`);
    console.log();

    // 3. companiesテーブルのIDを取得
    console.log('3. companiesテーブルのIDと照合中...');
    const companiesIds = new Map(); // id -> name のマップ
    offset = 0;
    
    while (offset < totalCompanies) {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('  エラー:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      data.forEach(record => companiesIds.set(record.id, record.name));
      offset += limit;
    }
    
    console.log(`  companies内のID: ${companiesIds.size}件`);
    console.log();

    // 4. 照合結果を分析
    console.log('4. 照合結果:');
    const unmatchedIds = [];
    const matchedIds = [];
    
    for (const metadataId of metadataIds) {
      if (companiesIds.has(metadataId)) {
        matchedIds.push(metadataId);
      } else {
        unmatchedIds.push(metadataId);
      }
    }
    
    console.log(`  照合成功: ${matchedIds.length}件`);
    console.log(`  照合失敗: ${unmatchedIds.length}件`);
    console.log(`  照合率: ${(matchedIds.length / metadataIds.size * 100).toFixed(2)}%`);
    console.log();

    // 5. 未照合IDのパターン分析
    console.log('5. 未照合IDのパターン分析:');
    const patterns = {
      'S100形式': [],
      'S10形式（その他）': [],
      '4桁数字': [],
      '数字のみ': [],
      'UUID形式': [],
      'その他': []
    };
    
    unmatchedIds.forEach(id => {
      if (/^S100/.test(id)) {
        patterns['S100形式'].push(id);
      } else if (/^S10/.test(id)) {
        patterns['S10形式（その他）'].push(id);
      } else if (/^[0-9]{4}$/.test(id)) {
        patterns['4桁数字'].push(id);
      } else if (/^[0-9]+$/.test(id)) {
        patterns['数字のみ'].push(id);
      } else if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
        patterns['UUID形式'].push(id);
      } else {
        patterns['その他'].push(id);
      }
    });
    
    for (const [pattern, ids] of Object.entries(patterns)) {
      if (ids.length > 0) {
        console.log(`  ${pattern}: ${ids.length}件`);
        console.log(`    例: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}`);
      }
    }
    console.log();

    // 6. 逆方向の未照合（companiesにあってmetadataにない）
    console.log('6. companiesにあってmetadataにないID:');
    const reverseUnmatched = [];
    
    for (const [companyId, companyName] of companiesIds) {
      if (!metadataIds.has(companyId)) {
        reverseUnmatched.push({ id: companyId, name: companyName });
      }
    }
    
    console.log(`  ${reverseUnmatched.length}件`);
    if (reverseUnmatched.length > 0) {
      console.log('  例（最初の10件）:');
      reverseUnmatched.slice(0, 10).forEach(company => {
        console.log(`    ${company.id}: ${company.name}`);
      });
    }
    console.log();

    // 7. 類似ID検索（未照合IDに似たcompaniesのIDを探す）
    console.log('7. 類似ID検索（未照合IDの最初の5件）:');
    const sampleUnmatched = unmatchedIds.slice(0, 5);
    
    for (const unmatchedId of sampleUnmatched) {
      console.log(`  ${unmatchedId}:`);
      
      // 類似度計算（簡易版）
      const similar = [];
      for (const [companyId, companyName] of companiesIds) {
        // 先頭8文字が一致
        if (unmatchedId.substring(0, 8) === companyId.substring(0, 8)) {
          similar.push({ id: companyId, name: companyName, match: '先頭8文字一致' });
        }
        // 長さが同じで1文字違い
        else if (unmatchedId.length === companyId.length) {
          let diff = 0;
          for (let i = 0; i < unmatchedId.length; i++) {
            if (unmatchedId[i] !== companyId[i]) diff++;
          }
          if (diff === 1) {
            similar.push({ id: companyId, name: companyName, match: '1文字違い' });
          }
        }
      }
      
      if (similar.length > 0) {
        similar.slice(0, 3).forEach(s => {
          console.log(`    → ${s.id}: ${s.name} (${s.match})`);
        });
      } else {
        console.log('    → 類似IDなし');
      }
    }
    console.log();

    // 8. 詳細レポート生成
    console.log('8. 詳細レポート:');
    console.log(`  未照合IDリスト: unmatched_ids.json に保存`);
    
    const fs = require('fs');
    const report = {
      summary: {
        total_metadata_records: totalMetadata,
        total_companies: totalCompanies,
        unique_metadata_ids: metadataIds.size,
        matched_count: matchedIds.length,
        unmatched_count: unmatchedIds.length,
        match_rate: `${(matchedIds.length / metadataIds.size * 100).toFixed(2)}%`
      },
      patterns: Object.entries(patterns).map(([pattern, ids]) => ({
        pattern,
        count: ids.length,
        examples: ids.slice(0, 10)
      })).filter(p => p.count > 0),
      unmatched_ids: unmatchedIds.slice(0, 100), // 最初の100件のみ
      reverse_unmatched: reverseUnmatched.slice(0, 100)
    };
    
    fs.writeFileSync('unmatched_ids_report.json', JSON.stringify(report, null, 2));
    console.log('  レポートを保存しました: unmatched_ids_report.json');

  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
analyzeUnmatchedRecords().catch(console.error);