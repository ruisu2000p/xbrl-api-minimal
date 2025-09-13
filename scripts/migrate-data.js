// データ移行スクリプト
// ローカルのMarkdownファイルをSupabaseに移行

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 環境変数の読み込み
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ローカルデータのパス
const BASE_PATH = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';

// 企業IDを生成
function generateCompanyId(dirName) {
  return crypto.createHash('md5').update(dirName).digest('hex').substring(0, 10).toUpperCase();
}

// 企業名を抽出
function extractCompanyName(dirName) {
  // ディレクトリ名から企業名を抽出するロジック
  const match = dirName.match(/^(.+?)_/);
  return match ? match[1] : dirName;
}

// セクターを判定
function extractSector(companyName) {
  // 簡易的なセクター判定ロジック
  const sectorMap = {
    'トヨタ': '輸送用機器',
    'ソニー': '電気機器',
    '三菱': '銀行業',
    'イオン': '小売業',
    // ... 他の企業
  };
  
  for (const [key, sector] of Object.entries(sectorMap)) {
    if (companyName.includes(key)) return sector;
  }
  return '未分類';
}

// 財務データをパース
async function parseFinancialData(content) {
  // Markdownから財務データを抽出
  const data = {};
  
  // 売上高を抽出
  const revenueMatch = content.match(/売上高[：:]\s*([\d,]+)/);
  if (revenueMatch) {
    data.revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
  }
  
  // 営業利益を抽出
  const operatingIncomeMatch = content.match(/営業利益[：:]\s*([\d,]+)/);
  if (operatingIncomeMatch) {
    data.operating_income = parseInt(operatingIncomeMatch[1].replace(/,/g, ''));
  }
  
  // 当期純利益を抽出
  const netIncomeMatch = content.match(/当期純利益[：:]\s*([\d,]+)/);
  if (netIncomeMatch) {
    data.net_income = parseInt(netIncomeMatch[1].replace(/,/g, ''));
  }
  
  return data;
}

// メイン処理
async function migrateData() {
  console.log('🚀 データ移行を開始します...');
  
  try {
    // ディレクトリ一覧を取得
    const directories = await fs.readdir(BASE_PATH);
    console.log(`📁 ${directories.length}社のデータが見つかりました`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // バッチ処理（10社ずつ）
    const batchSize = 10;
    for (let i = 0; i < directories.length; i += batchSize) {
      const batch = directories.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (dir) => {
        try {
          const companyPath = path.join(BASE_PATH, dir);
          const stats = await fs.stat(companyPath);
          
          if (!stats.isDirectory()) return;
          
          // 企業データを作成
          const companyId = generateCompanyId(dir);
          const companyName = extractCompanyName(dir);
          const sector = extractSector(companyName);
          
          // Supabaseに企業を登録
          const { error: companyError } = await supabase
            .from('companies')
            .upsert({
              id: companyId,
              name: companyName,
              sector: sector,
              listing: '東証プライム'
            });
          
          if (companyError) {
            console.error(`❌ 企業登録エラー: ${companyName}`, companyError);
            errorCount++;
            return;
          }
          
          // PublicDocディレクトリのファイルを処理
          const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
          if (await fs.access(publicDocPath).then(() => true).catch(() => false)) {
            const files = await fs.readdir(publicDocPath);
            
            for (const file of files) {
              if (!file.endsWith('.md')) continue;
              
              const filePath = path.join(publicDocPath, file);
              const content = await fs.readFile(filePath, 'utf-8');
              
              // Supabase Storageにファイルをアップロード
              const storageKey = `documents/${companyId}/${file}`;
              const { error: uploadError } = await supabase.storage
                .from('xbrl-documents')
                .upload(storageKey, content, {
                  contentType: 'text/markdown',
                  upsert: true
                });
              
              if (uploadError) {
                console.error(`❌ ファイルアップロードエラー: ${file}`, uploadError);
                continue;
              }
              
              // ドキュメント情報をDBに保存
              const { error: docError } = await supabase
                .from('documents')
                .insert({
                  company_id: companyId,
                  year: 2021,
                  doc_type: 'securities_report',
                  storage_key: storageKey,
                  metadata: {
                    original_filename: file,
                    size: content.length
                  }
                });
              
              if (docError) {
                console.error(`❌ ドキュメント登録エラー: ${file}`, docError);
              }
              
              // 財務データを抽出して保存
              const financialData = await parseFinancialData(content);
              if (Object.keys(financialData).length > 0) {
                const { error: finError } = await supabase
                  .from('financial_data')
                  .insert({
                    company_id: companyId,
                    year: 2021,
                    ...financialData
                  });
                
                if (finError) {
                  console.error(`❌ 財務データ登録エラー: ${companyName}`, finError);
                }
              }
            }
          }
          
          successCount++;
          console.log(`✅ ${companyName} のデータ移行完了 (${successCount}/${directories.length})`);
          
        } catch (error) {
          console.error(`❌ エラー: ${dir}`, error);
          errorCount++;
        }
      }));
      
      // 進捗表示
      console.log(`📊 進捗: ${Math.min(i + batchSize, directories.length)}/${directories.length} 完了`);
      
      // レート制限回避のため少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✨ データ移行完了！');
    console.log(`成功: ${successCount}社, エラー: ${errorCount}社`);
    
  } catch (error) {
    console.error('💥 致命的エラー:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  migrateData();
}