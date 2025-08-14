const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'
);

// 進捗表示用
let processedCount = 0;
let errorCount = 0;
const errors = [];

async function uploadMarkdownFiles() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('XBRL Markdown アップロードスクリプト');
  console.log('===========================================');
  console.log(`ソースディレクトリ: ${baseDir}`);
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
  console.log('');

  try {
    // ディレクトリの存在確認
    await fs.access(baseDir);
    
    // すべての企業ディレクトリを取得
    const companies = await fs.readdir(baseDir);
    const totalCompanies = companies.length;
    
    console.log(`📁 ${totalCompanies}社のデータを検出しました`);
    console.log('');
    
    // バッチ処理の設定
    const BATCH_SIZE = 10; // 同時処理数
    const START_INDEX = 500; // 開始位置（すでに500社完了予定）
    const END_INDEX = totalCompanies; // 全4,231社をアップロード！
    
    console.log(`処理範囲: ${START_INDEX + 1}社目 〜 ${Math.min(END_INDEX, totalCompanies)}社目`);
    console.log('');
    
    // バッチ処理開始
    for (let i = START_INDEX; i < Math.min(END_INDEX, totalCompanies); i += BATCH_SIZE) {
      const batch = companies.slice(i, Math.min(i + BATCH_SIZE, END_INDEX));
      
      console.log(`バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${i + 1}〜${Math.min(i + BATCH_SIZE, END_INDEX)}社目を処理中...`);
      
      // バッチ内の企業を並列処理
      await Promise.all(batch.map(async (companyDir) => {
        await processCompany(companyDir, baseDir);
      }));
      
      // 進捗表示
      console.log(`✅ 進捗: ${processedCount}/${Math.min(END_INDEX, totalCompanies)}社完了, エラー: ${errorCount}件`);
      console.log('');
    }
    
    // 完了レポート
    console.log('===========================================');
    console.log('アップロード完了');
    console.log('===========================================');
    console.log(`✅ 成功: ${processedCount}社`);
    console.log(`❌ エラー: ${errorCount}社`);
    
    if (errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach(err => {
        console.log(`  - ${err.company}: ${err.message}`);
      });
    }
    
    console.log('\n次のステップ:');
    console.log('1. Supabaseダッシュボードでデータを確認');
    console.log('2. APIエンドポイントをSupabase対応に更新');
    console.log('3. END_INDEXを増やして残りの企業をアップロード');
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error.message);
    console.error(error.stack);
  }
}

async function processCompany(companyDir, baseDir) {
  const companyPath = path.join(baseDir, companyDir);
  
  try {
    const stats = await fs.stat(companyPath);
    
    if (!stats.isDirectory()) {
      return; // ディレクトリでない場合はスキップ
    }
    
    // ディレクトリ名から企業IDを抽出（最初の英数字部分のみ使用）
    const companyIdMatch = companyDir.match(/^([A-Z0-9]+)/i);
    const companyId = companyIdMatch ? companyIdMatch[1] : companyDir.replace(/[^A-Za-z0-9]/g, '_');
    
    // PublicDoc_markdownディレクトリを探す
    const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
    
    try {
      await fs.access(publicDocPath);
    } catch {
      // PublicDocがない場合はAuditDocを試す
      const auditDocPath = path.join(companyPath, 'AuditDoc_markdown');
      try {
        await fs.access(auditDocPath);
        await processMarkdownFiles(companyId, auditDocPath, 'audit', companyDir);
        return;
      } catch {
        throw new Error('Markdownディレクトリが見つかりません');
      }
    }
    
    // PublicDocを処理（クリーンなIDを使用）
    await processMarkdownFiles(companyId, publicDocPath, 'public', companyDir);
    
  } catch (error) {
    errorCount++;
    errors.push({
      company: companyDir,
      message: error.message
    });
  }
}

async function processMarkdownFiles(companyId, docPath, docType, originalDirName) {
  const mdFiles = await fs.readdir(docPath);
  const mainFile = mdFiles.find(f => f.endsWith('.md'));
  
  if (!mainFile) {
    throw new Error('Markdownファイルが見つかりません');
  }
  
  // ファイル内容を読み込み
  const content = await fs.readFile(
    path.join(docPath, mainFile),
    'utf-8'
  );
  
  // 企業情報を抽出（オリジナルディレクトリ名を使用）
  const companyInfo = extractCompanyInfo(content, originalDirName || companyId);
  
  // 1. 企業マスタをデータベースに保存（クリーンなIDを使用）
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .upsert({
      id: companyId,  // クリーンなID
      ticker: companyInfo.ticker,
      name: companyInfo.name,
      sector: companyInfo.sector,
      market: companyInfo.market,
      description: originalDirName  // オリジナルのディレクトリ名を保存
    }, {
      onConflict: 'id'
    });
  
  if (companyError) {
    throw new Error(`企業データ保存エラー: ${companyError.message}`);
  }
  
  // 年度を抽出
  const fiscalYear = extractFiscalYear(content);
  
  // 2. Markdownファイルをストレージにアップロード（年度/企業ID/ファイル名の構造）
  // ファイル名も英数字のみに変換
  const cleanFileName = mainFile.replace(/[^A-Za-z0-9._-]/g, '_');
  const fileName = `${fiscalYear}/${companyId}/${docType}_${cleanFileName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('markdown-files')
    .upload(fileName, content, {
      contentType: 'text/markdown; charset=utf-8',
      upsert: true
    });
  
  if (uploadError) {
    throw new Error(`ファイルアップロードエラー: ${uploadError.message}`);
  }
  
  // 3. 財務レポートをデータベースに保存
  const financialData = extractFinancialData(content);
  
  const { data: reportData, error: reportError } = await supabase
    .from('financial_reports')
    .upsert({
      company_id: companyId,  // クリーンなIDを使用
      fiscal_year: fiscalYear,  // 上で抽出した年度を使用
      fiscal_period: `${fiscalYear}年3月期`,  // 決算期を追加
      markdown_content: content.substring(0, 10000), // 最初の10000文字
      financial_data: financialData,
      doc_type: docType,
      storage_path: fileName,  // 年度付きのパスを保存
      metadata: { original_dir: originalDirName }  // オリジナルディレクトリ名をメタデータに保存
    }, {
      onConflict: 'company_id,fiscal_year,doc_type'  // doc_typeも含める
    });
  
  if (reportError) {
    throw new Error(`レポート保存エラー: ${reportError.message}`);
  }
  
  processedCount++;
}

// 企業情報を抽出
function extractCompanyInfo(content, dirName) {
  const info = {
    name: 'Unknown Company',
    ticker: null,
    sector: null,
    market: null
  };
  
  // 企業名を抽出（最初の#行）
  const nameMatch = content.match(/^#\s+(.+?)$/m);
  if (nameMatch) {
    info.name = nameMatch[1].trim();
  }
  
  // 証券コードを抽出（ディレクトリ名から）
  const tickerMatch = dirName.match(/(\d{4})/);
  if (tickerMatch) {
    info.ticker = tickerMatch[1];
  }
  
  // 業種を抽出
  const sectorMatch = content.match(/業種[：:]\s*(.+?)[\r\n]/);
  if (sectorMatch) {
    info.sector = sectorMatch[1].trim();
  }
  
  // 市場を抽出
  const marketMatch = content.match(/市場[：:]\s*(.+?)[\r\n]/);
  if (marketMatch) {
    info.market = marketMatch[1].trim();
  }
  
  return info;
}

// 決算年度を抽出
function extractFiscalYear(content) {
  // 「2022年3月期」のようなパターンを探す
  const yearMatch = content.match(/(\d{4})年\d{1,2}月期/);
  if (yearMatch) {
    return parseInt(yearMatch[1]);
  }
  
  // 「令和4年」のようなパターン
  const reiwaMatch = content.match(/令和(\d+)年/);
  if (reiwaMatch) {
    return 2018 + parseInt(reiwaMatch[1]); // 令和元年 = 2019年
  }
  
  // デフォルトは2022年
  return 2022;
}

// 財務データを抽出
function extractFinancialData(content) {
  const data = {};
  
  // 売上高を探す（様々なパターンに対応）
  const revenuePatterns = [
    /売上高[^0-9]*?([\d,，]+)\s*千円/,
    /売上高[^0-9]*?([\d,，]+)\s*百万円/,
    /営業収益[^0-9]*?([\d,，]+)/,
    /経常収益[^0-9]*?([\d,，]+)/
  ];
  
  for (const pattern of revenuePatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = match[1].replace(/[,，]/g, '');
      data.revenue = parseInt(value);
      
      // 単位の調整
      if (pattern.source.includes('百万円')) {
        data.revenue *= 1000; // 百万円→千円
      }
      break;
    }
  }
  
  // 営業利益
  const opIncomeMatch = content.match(/営業利益[^0-9]*?([\d,，]+)/);
  if (opIncomeMatch) {
    data.operating_income = parseInt(opIncomeMatch[1].replace(/[,，]/g, ''));
  }
  
  // 当期純利益
  const netIncomePatterns = [
    /当期純利益[^0-9]*?([\d,，]+)/,
    /親会社株主に帰属する当期純利益[^0-9]*?([\d,，]+)/
  ];
  
  for (const pattern of netIncomePatterns) {
    const match = content.match(pattern);
    if (match) {
      data.net_income = parseInt(match[1].replace(/[,，]/g, ''));
      break;
    }
  }
  
  // 総資産
  const assetsMatch = content.match(/総資産[^0-9]*?([\d,，]+)/);
  if (assetsMatch) {
    data.total_assets = parseInt(assetsMatch[1].replace(/[,，]/g, ''));
  }
  
  // 純資産
  const equityMatch = content.match(/純資産[^0-9]*?([\d,，]+)/);
  if (equityMatch) {
    data.shareholders_equity = parseInt(equityMatch[1].replace(/[,，]/g, ''));
  }
  
  // ROE
  const roeMatch = content.match(/ROE[^0-9]*?([\d.]+)\s*[%％]/);
  if (roeMatch) {
    data.roe = parseFloat(roeMatch[1]);
  }
  
  // 従業員数
  const employeesMatch = content.match(/従業員数[^0-9]*?([\d,，]+)\s*[人名]/);
  if (employeesMatch) {
    data.employees = parseInt(employeesMatch[1].replace(/[,，]/g, ''));
  }
  
  return data;
}

// エラーハンドリング付きで実行
uploadMarkdownFiles().catch(error => {
  console.error('致命的エラー:', error);
  process.exit(1);
});