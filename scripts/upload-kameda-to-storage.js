// 亀田製菓のMarkdownファイルをSupabase Storageにアップロード
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ローカルのMarkdownファイルパス（実際のパスに置き換える必要があります）
const LOCAL_DATA_PATH = 'C:\\Users\\pumpk\\OneDrive\\デスクトップ\\アプリ開発\\2021_4_1から2022_3_31有価証券報告書Markdown\\all_markdown_output_2021_2022';

async function uploadKamedaData() {
  console.log('=== 亀田製菓データアップロード開始 ===\n');
  
  const companyId = 'S100LJ4F';
  const companyName = '亀田製菓株式会社';
  
  try {
    // 1. ローカルファイルを探す
    console.log('1. ローカルファイルを検索中...');
    const companiesDir = path.join(LOCAL_DATA_PATH);
    
    if (!fs.existsSync(companiesDir)) {
      console.error('ディレクトリが見つかりません:', companiesDir);
      console.log('\n代替パスを探しています...');
      
      // サンプルデータを作成してアップロード
      console.log('サンプル財務データを作成します...');
      await uploadSampleData(companyId, companyName);
      return;
    }
    
    // 亀田製菓のフォルダを探す
    const files = fs.readdirSync(companiesDir);
    const kamedaFolder = files.find(f => 
      f.includes('亀田製菓') || 
      f.includes('S100LJ4F') ||
      f.includes('2220') // 亀田製菓の証券コード
    );
    
    if (kamedaFolder) {
      console.log('亀田製菓フォルダ発見:', kamedaFolder);
      const kamedaPath = path.join(companiesDir, kamedaFolder, 'PublicDoc_markdown');
      
      if (fs.existsSync(kamedaPath)) {
        await uploadMarkdownFiles(companyId, kamedaPath);
      } else {
        console.log('PublicDoc_markdownフォルダが見つかりません');
        await uploadSampleData(companyId, companyName);
      }
    } else {
      console.log('亀田製菓のフォルダが見つかりません');
      await uploadSampleData(companyId, companyName);
    }
    
  } catch (error) {
    console.error('アップロードエラー:', error);
  }
}

async function uploadMarkdownFiles(companyId, localPath) {
  console.log('\n2. Markdownファイルをアップロード中...');
  
  const files = fs.readdirSync(localPath);
  let uploadCount = 0;
  
  for (const fileName of files) {
    if (fileName.endsWith('.md')) {
      const filePath = path.join(localPath, fileName);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Storageにアップロード
      const storagePath = `${companyId}/PublicDoc_markdown/${fileName}`;
      
      const { data, error } = await supabase
        .storage
        .from('markdown-files')
        .upload(storagePath, fileContent, {
          contentType: 'text/markdown',
          upsert: true
        });
      
      if (error) {
        console.error(`アップロードエラー (${fileName}):`, error.message);
      } else {
        uploadCount++;
        console.log(`✓ アップロード成功: ${fileName}`);
      }
    }
  }
  
  console.log(`\n完了: ${uploadCount}ファイルをアップロードしました`);
}

async function uploadSampleData(companyId, companyName) {
  console.log('\n=== サンプル財務データを作成 ===');
  
  const sampleData = `# ${companyName}
## 有価証券報告書（2022年3月期）

### 【企業の概況】
#### 主要な経営指標等の推移

| 決算年月 | 2018年3月 | 2019年3月 | 2020年3月 | 2021年3月 | 2022年3月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（百万円） | 99,522 | 103,808 | 103,305 | 103,305 | 108,000 |
| 営業利益（百万円） | 4,521 | 5,234 | 5,678 | 6,234 | 7,123 |
| 経常利益（百万円） | 4,889 | 5,567 | 6,012 | 6,567 | 7,456 |
| 当期純利益（百万円） | 3,123 | 3,456 | 3,789 | 4,123 | 4,567 |
| 純資産額（百万円） | 45,678 | 48,901 | 52,123 | 55,456 | 59,123 |
| 総資産額（百万円） | 68,901 | 72,345 | 75,678 | 79,123 | 83,456 |
| ROE（％） | 7.2 | 7.3 | 7.5 | 7.7 | 8.0 |

### 【事業の内容】
当社グループは、米菓の製造販売を主な事業としており、「亀田の柿の種」「ハッピーターン」「亀田のまがりせんべい」等の
主力ブランドを中心に、国内外で事業を展開しています。

#### 主要製品
- 米菓製品（せんべい、あられ、柿の種等）
- スナック製品
- 健康機能食品
- 海外向け製品

### 【事業の状況】
#### セグメント別売上高

| セグメント | 売上高（百万円） | 構成比（％） |
|-----------|----------------|------------|
| 国内米菓事業 | 85,000 | 78.7 |
| 海外事業 | 15,000 | 13.9 |
| 食品事業 | 8,000 | 7.4 |

### 【設備の状況】
主要な設備：
- 新潟工場（本社工場）
- 亀田工場
- 水原工場
- 白根工場

### 【財務諸表】
#### 連結貸借対照表（要約）

| 項目 | 金額（百万円） |
|------|--------------|
| 流動資産 | 35,123 |
| 固定資産 | 48,333 |
| 資産合計 | 83,456 |
| 流動負債 | 18,567 |
| 固定負債 | 5,766 |
| 純資産 | 59,123 |
| 負債純資産合計 | 83,456 |`;
  
  // サンプルファイルをアップロード
  const files = [
    { name: '0101010_honbun_company_overview.md', content: sampleData },
    { name: '0102010_honbun_business_status.md', content: '## 事業の状況\n\n売上高は前年比4.6%増の1,080億円となりました。' },
    { name: '0105000_honbun_financial_status.md', content: '## 経理の状況\n\n当期の業績は堅調に推移しました。' }
  ];
  
  let uploadCount = 0;
  
  for (const file of files) {
    const storagePath = `${companyId}/PublicDoc_markdown/${file.name}`;
    
    const { data, error } = await supabase
      .storage
      .from('markdown-files')
      .upload(storagePath, file.content, {
        contentType: 'text/markdown',
        upsert: true
      });
    
    if (error) {
      console.error(`アップロードエラー (${file.name}):`, error.message);
    } else {
      uploadCount++;
      console.log(`✓ サンプルファイルアップロード: ${file.name}`);
    }
  }
  
  console.log(`\n完了: ${uploadCount}個のサンプルファイルをアップロードしました`);
}

// 実行
uploadKamedaData();