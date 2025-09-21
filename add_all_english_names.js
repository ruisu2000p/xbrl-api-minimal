// Excelファイルからすべての英語名を追加
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set');
  console.log('Please set it using: SET SUPABASE_SERVICE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function loadExcelData() {
  const excelPath = 'C:\\Users\\pumpk\\Downloads\\merged_financial_fdi_complete.xlsx';
  console.log('Loading Excel file:', excelPath);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Loaded ${jsonData.length} rows from Excel`);

  // docIDと英語名のマッピングを作成
  const docIdToEnglishName = new Map();
  const companyNameToEnglishName = new Map();

  for (const row of jsonData) {
    const docID = row['docID'];
    const companyName = row['企業名'];
    const englishName = row['English__company name'];

    if (docID && englishName && englishName.trim()) {
      docIdToEnglishName.set(docID, englishName.trim());
    }

    if (companyName && englishName && englishName.trim()) {
      // 複数のdocIDで同じ企業名の場合、最後の英語名を使用
      companyNameToEnglishName.set(companyName.trim(), englishName.trim());
    }
  }

  console.log(`Found ${docIdToEnglishName.size} unique docID mappings`);
  console.log(`Found ${companyNameToEnglishName.size} unique company name mappings`);

  return { docIdToEnglishName, companyNameToEnglishName };
}

async function updateEnglishNames() {
  try {
    const { docIdToEnglishName, companyNameToEnglishName } = await loadExcelData();

    // まず、すべてのcompany_idと企業名の一覧を取得
    console.log('\nFetching all unique companies from database...');
    const { data: companies, error: fetchError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name')
      .order('company_id');

    if (fetchError) {
      console.error('Error fetching companies:', fetchError);
      return;
    }

    // ユニークな企業のみを抽出
    const uniqueCompanies = new Map();
    for (const record of companies) {
      if (record.company_id && !uniqueCompanies.has(record.company_id)) {
        uniqueCompanies.set(record.company_id, record.company_name);
      }
    }

    console.log(`Found ${uniqueCompanies.size} unique companies in database`);

    // 各company_idに対して英語名を検索して更新
    let totalUpdated = 0;
    let totalFailed = 0;
    let notFound = 0;

    for (const [companyId, companyName] of uniqueCompanies) {
      let englishName = null;

      // まずdocIDで検索
      if (docIdToEnglishName.has(companyId)) {
        englishName = docIdToEnglishName.get(companyId);
      }
      // 次に企業名で検索
      else if (companyName && companyNameToEnglishName.has(companyName)) {
        englishName = companyNameToEnglishName.get(companyName);
      }

      if (englishName) {
        // このcompany_idのすべてのレコードを更新
        const { error: updateError } = await supabase
          .from('markdown_files_metadata')
          .update({ english_name: englishName })
          .eq('company_id', companyId);

        if (updateError) {
          console.error(`Failed to update ${companyId}:`, updateError.message);
          totalFailed++;
        } else {
          totalUpdated++;
          if (totalUpdated % 100 === 0) {
            console.log(`Progress: ${totalUpdated} companies updated...`);
          }
        }
      } else {
        notFound++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Total companies processed: ${uniqueCompanies.size}`);
    console.log(`Successfully updated: ${totalUpdated}`);
    console.log(`Failed to update: ${totalFailed}`);
    console.log(`English name not found: ${notFound}`);

    // 統計を確認
    console.log('\n=== Verifying Results ===');
    const { data: stats, error: statsError } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT
            COUNT(*) as total_records,
            COUNT(CASE WHEN english_name IS NOT NULL AND english_name != '' THEN 1 END) as with_english,
            COUNT(CASE WHEN english_name IS NULL OR english_name = '' THEN 1 END) as without_english,
            ROUND(COUNT(CASE WHEN english_name IS NOT NULL AND english_name != '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentage_with_english
          FROM markdown_files_metadata
        `
      });

    if (!statsError && stats && stats.data && stats.data[0]) {
      const result = stats.data[0];
      console.log(`Total records: ${result.total_records}`);
      console.log(`With English names: ${result.with_english} (${result.percentage_with_english}%)`);
      console.log(`Without English names: ${result.without_english}`);
    }

    // トヨタ自動車を確認
    console.log('\n=== Checking Toyota Motor ===');
    const { data: toyota, error: toyotaError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, english_name, fiscal_year')
      .like('company_name', '%トヨタ自動車%')
      .limit(5);

    if (!toyotaError && toyota) {
      console.log('Toyota Motor records:');
      toyota.forEach(record => {
        console.log(`  ${record.company_id}: ${record.company_name} => ${record.english_name || 'NO ENGLISH NAME'}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// 実行
updateEnglishNames();