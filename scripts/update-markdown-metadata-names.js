// markdown_files_metadataテーブルのcompany_nameを
// companiesテーブルから照合して更新するスクリプト

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCompanyNames() {
  console.log('=== markdown_files_metadataのcompany_name更新 ===\n');

  try {
    // 1. まず両テーブルの状態を確認
    console.log('1. テーブル状態の確認:');
    
    // companiesテーブルの件数
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    console.log(`  companiesテーブル: ${companiesCount}件`);

    // markdown_files_metadataテーブルの件数
    const { count: metadataCount, error: metadataCountError } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    if (metadataCountError) {
      if (metadataCountError.message.includes('does not exist')) {
        console.log('  markdown_files_metadataテーブルが存在しません');
        console.log('\nテーブル作成が必要です。');
        return;
      }
      console.log(`  エラー: ${metadataCountError.message}`);
      return;
    }
    console.log(`  markdown_files_metadataテーブル: ${metadataCount}件`);
    console.log();

    // 2. company_nameが空のレコードを確認
    console.log('2. company_nameが空のレコード数を確認:');
    const { count: emptyNameCount } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true })
      .or('company_name.is.null,company_name.eq.');
    console.log(`  空のcompany_name: ${emptyNameCount}件`);
    console.log();

    // 3. 更新処理
    if (emptyNameCount > 0) {
      console.log('3. company_nameの更新を開始:');
      
      // バッチサイズ
      const batchSize = 100;
      let offset = 0;
      let totalUpdated = 0;
      let totalErrors = 0;

      while (offset < metadataCount) {
        // markdown_files_metadataからcompany_idを取得
        const { data: metadataRecords, error: fetchError } = await supabase
          .from('markdown_files_metadata')
          .select('id, company_id, company_name')
          .range(offset, offset + batchSize - 1);

        if (fetchError) {
          console.log(`  取得エラー (offset ${offset}): ${fetchError.message}`);
          break;
        }

        if (!metadataRecords || metadataRecords.length === 0) {
          break;
        }

        // 各レコードのcompany_nameを更新
        for (const record of metadataRecords) {
          // 既にcompany_nameがある場合はスキップ
          if (record.company_name && record.company_name.trim() !== '') {
            continue;
          }

          // companiesテーブルから名前を取得
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', record.company_id)
            .single();

          if (companyError) {
            if (companyError.code !== 'PGRST116') { // not found以外
              console.log(`  エラー (${record.company_id}): ${companyError.message}`);
              totalErrors++;
            }
            continue;
          }

          if (company && company.name) {
            // markdown_files_metadataを更新
            const { error: updateError } = await supabase
              .from('markdown_files_metadata')
              .update({ company_name: company.name })
              .eq('id', record.id);

            if (updateError) {
              console.log(`  更新エラー (${record.id}): ${updateError.message}`);
              totalErrors++;
            } else {
              totalUpdated++;
            }
          }
        }

        console.log(`  処理中... ${offset + metadataRecords.length}/${metadataCount}件 (更新: ${totalUpdated}件)`);
        offset += batchSize;
      }

      console.log(`\n=== 更新完了 ===`);
      console.log(`  更新成功: ${totalUpdated}件`);
      console.log(`  エラー: ${totalErrors}件`);
    } else {
      console.log('更新が必要なレコードはありません。');
    }

    // 4. 更新後の確認
    console.log('\n4. 更新後の確認:');
    const { data: sampleData } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name')
      .not('company_name', 'is', null)
      .limit(5);

    if (sampleData && sampleData.length > 0) {
      console.log('  サンプル（最初の5件）:');
      sampleData.forEach(record => {
        console.log(`    ${record.company_id}: ${record.company_name}`);
      });
    }

    // 5. クスリのアオキを検索
    console.log('\n5. クスリのアオキ関連のメタデータを確認:');
    const { data: kusuriData } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, file_name')
      .ilike('company_name', '%クスリ%')
      .limit(10);

    if (kusuriData && kusuriData.length > 0) {
      console.log(`  ${kusuriData.length}件見つかりました:`);
      kusuriData.forEach(record => {
        console.log(`    ${record.company_id}: ${record.company_name}`);
        console.log(`      ファイル: ${record.file_name}`);
      });
    } else {
      console.log('  クスリのアオキ関連のメタデータが見つかりません');
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// SQLでの一括更新も可能
async function updateWithSQL() {
  console.log('\n=== SQL一括更新（高速版）===\n');
  
  // PostgreSQLのUPDATE FROM句を使用した一括更新
  const { data, error } = await supabase.rpc('update_metadata_names', {
    sql_query: `
      UPDATE markdown_files_metadata AS m
      SET company_name = c.name
      FROM companies AS c
      WHERE m.company_id = c.id
      AND (m.company_name IS NULL OR m.company_name = '')
    `
  });

  if (error) {
    console.log('RPC実行エラー:', error.message);
    console.log('注意: RPCが設定されていない場合は、上記のJavaScript版を使用してください。');
  } else {
    console.log('SQL更新完了:', data);
  }
}

// メイン実行
async function main() {
  await updateCompanyNames();
  
  // SQL版も試す（RPCが設定されている場合）
  // await updateWithSQL();
}

main().catch(console.error);