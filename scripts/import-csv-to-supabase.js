// CSVデータをSupabaseのcompaniesテーブルに統合するスクリプト
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// CSVファイルのパス
const CSV_FILE = 'C:/Users/pumpk/Downloads/2025-09-01T11-24_export.csv';

// バッチサイズ
const BATCH_SIZE = 100;

async function importData() {
  const companies = [];
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let errorCount = 0;

  console.log('CSVファイルを読み込み中...');

  // CSVファイルを読み込む
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        // カラム名を確認（BOMを削除）
        const docId = row['docID'] || row['﻿docID'] || row.docID;
        const companyName = row['企業名'] || row.企業名;
        const documentName = row['書類名'] || row.書類名;
        const submissionDate = row['提出日'] || row.提出日;

        if (docId && companyName) {
          companies.push({
            id: docId,
            name: companyName,
            edinet_code: docId,
            description: documentName || null,
            submission_date: submissionDate || null,
            // 既存のフィールドは更新しない（nullでない場合のみ更新）
            updated_at: new Date().toISOString()
          });
        }

        // バッチ処理
        if (companies.length >= BATCH_SIZE) {
          processBatch([...companies]);
          companies.length = 0;
        }
      })
      .on('end', async () => {
        // 残りのデータを処理
        if (companies.length > 0) {
          await processBatch(companies);
        }
        
        console.log('\n=== インポート完了 ===');
        console.log(`処理済み: ${processedCount}件`);
        console.log(`更新: ${updatedCount}件`);
        console.log(`新規追加: ${insertedCount}件`);
        console.log(`エラー: ${errorCount}件`);
        resolve();
      })
      .on('error', (error) => {
        console.error('CSVエラー:', error);
        reject(error);
      });
  });

  async function processBatch(batch) {
    processedCount += batch.length;
    console.log(`処理中... ${processedCount}件`);

    for (const company of batch) {
      try {
        // まず既存のレコードを確認
        const { data: existing, error: selectError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', company.id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          console.error(`選択エラー (${company.id}):`, selectError);
          errorCount++;
          continue;
        }

        if (existing) {
          // 既存レコードを更新（nameとdescriptionのみ）
          const updateData = {
            name: company.name,
            updated_at: company.updated_at
          };

          // descriptionがnullでない場合のみ更新
          if (company.description) {
            updateData.description = company.description;
          }

          const { error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', company.id);

          if (updateError) {
            console.error(`更新エラー (${company.id}):`, updateError);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          // 新規レコードを挿入
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              id: company.id,
              name: company.name,
              description: company.description,
              created_at: new Date().toISOString(),
              updated_at: company.updated_at
            });

          if (insertError) {
            console.error(`挿入エラー (${company.id}):`, insertError);
            errorCount++;
          } else {
            insertedCount++;
          }
        }
      } catch (error) {
        console.error(`処理エラー (${company.id}):`, error);
        errorCount++;
      }
    }
  }
}

// メイン実行
importData().catch(console.error);