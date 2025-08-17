// 亀田製菓のデータ状況確認スクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.localファイルを読み込む
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKamedaData() {
  console.log('=== 亀田製菓データ確認 ===\n');
  
  try {
    // 1. companiesテーブルから亀田製菓を検索
    console.log('1. companiesテーブルを確認...');
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', 'S100LJ4F');
    
    if (companyError) {
      console.error('Company検索エラー:', companyError);
    } else {
      console.log('亀田製菓の会社情報:', companies);
    }
    
    // 2. financial_reportsテーブルを確認（正しいテーブル名）
    console.log('\n2. financial_reportsテーブルを確認...');
    const { data: documents, error: docError } = await supabase
      .from('financial_reports')
      .select('*')
      .eq('company_id', 'S100LJ4F')
      .limit(5);
    
    if (docError) {
      console.error('Documents検索エラー:', docError);
      // テーブルが存在しない可能性
      console.log('financial_reportsテーブルが存在しない可能性があります');
    } else {
      console.log('亀田製菓のドキュメント数:', documents?.length || 0);
      if (documents && documents.length > 0) {
        console.log('最初のドキュメント:', documents[0]);
      }
    }
    
    // 3. Storageバケットを確認
    console.log('\n3. Storageバケットを確認...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.error('バケット一覧エラー:', bucketError);
    } else {
      console.log('利用可能なバケット:', buckets?.map(b => b.name));
    }
    
    // 4. markdown-filesバケットの中身を確認（もし存在すれば）
    if (buckets?.some(b => b.name === 'markdown-files')) {
      console.log('\n4. markdown-filesバケットの内容を確認...');
      const { data: files, error: filesError } = await supabase
        .storage
        .from('markdown-files')
        .list('S100LJ4F', {
          limit: 10
        });
      
      if (filesError) {
        console.error('ファイル一覧エラー:', filesError);
      } else {
        console.log('S100LJ4Fフォルダ内のファイル数:', files?.length || 0);
        if (files && files.length > 0) {
          console.log('ファイル名:', files.map(f => f.name));
        }
      }
    }
    
    // 5. 全体の統計情報
    console.log('\n5. データベース統計...');
    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log('総企業数:', totalCompanies);
    
    // financial_reportsが存在する場合
    const { count: totalDocs } = await supabase
      .from('financial_reports')
      .select('*', { count: 'exact', head: true });
    
    if (totalDocs !== null) {
      console.log('総ドキュメント数:', totalDocs);
    }
    
  } catch (error) {
    console.error('スクリプトエラー:', error);
  }
}

checkKamedaData();