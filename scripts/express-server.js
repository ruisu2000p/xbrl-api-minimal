require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 5001;

// Supabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 企業のファイル一覧を取得
app.get('/api/companies/:id/files', async (req, res) => {
  try {
    const companyId = req.params.id.toUpperCase();
    const year = req.query.year || '2021';
    const fileIndex = req.query.file;
    
    console.log(`Getting files for ${companyId} in year ${year}`);
    
    // ファイル一覧を取得
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list(`${year}/${companyId}`, { limit: 100 });
    
    if (error) {
      console.error('Storage error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'No files found' });
    }
    
    // ファイルをソート
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    // 特定のファイルを要求された場合
    if (fileIndex !== undefined) {
      const index = parseInt(fileIndex);
      if (isNaN(index) || index < 0 || index >= files.length) {
        return res.status(400).json({ error: 'Invalid file index' });
      }
      
      const file = files[index];
      
      // ファイルをダウンロード
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('markdown-files')
        .download(`${year}/${companyId}/${file.name}`);
      
      if (downloadError) {
        return res.status(500).json({ error: 'Failed to download file' });
      }
      
      const content = await fileData.text();
      
      return res.json({
        company_id: companyId,
        year,
        file: {
          index,
          name: file.name,
          size: file.metadata?.size || 0,
          content
        }
      });
    }
    
    // ファイル一覧を返す
    const fileList = files.map((file, index) => ({
      index,
      name: file.name,
      size: file.metadata?.size || 0,
      section: extractSectionName(file.name)
    }));
    
    // 企業名を取得
    let companyName = '';
    if (files.length > 0) {
      try {
        const { data: headerData } = await supabase.storage
          .from('markdown-files')
          .download(`${year}/${companyId}/${files[0].name}`);
        
        if (headerData) {
          const headerContent = await headerData.text();
          const nameMatch = headerContent.match(/提出会社名】(.+)/);
          if (nameMatch) {
            companyName = nameMatch[1].trim();
          }
        }
      } catch (e) {
        console.error('Failed to get company name:', e);
      }
    }
    
    res.json({
      company_id: companyId,
      company_name: companyName,
      year,
      total_files: files.length,
      files: fileList
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 全企業のリストを取得
app.get('/api/companies', async (req, res) => {
  try {
    const year = req.query.year || '2021';
    const limit = parseInt(req.query.limit) || 100;
    
    const { data: dirs, error } = await supabase.storage
      .from('markdown-files')
      .list(year, { limit });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    const companies = dirs.map(dir => ({
      id: dir.name,
      name: dir.name // 実際の企業名は各ディレクトリから取得する必要がある
    }));
    
    res.json({
      total: companies.length,
      companies
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// セクション名を抽出する関数
function extractSectionName(filename) {
  const sections = {
    '0000000': 'ヘッダー情報',
    '0101010': '企業の概況',
    '0102010': '事業の状況',
    '0103010': '設備の状況',
    '0104010': '提出会社の状況',
    '0105000': '経理の状況',
    '0105010': '連結財務諸表',
    '0105020': '財務諸表',
    '0106010': 'コーポレートガバナンス',
    '0107010': '提出会社の株式事務',
    '0200010': '独立監査人の監査報告書',
    '0201010': '監査報告書'
  };
  
  const prefix = filename.substring(0, 7);
  return sections[prefix] || 'その他';
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  GET /health`);
  console.log(`  GET /api/companies`);
  console.log(`  GET /api/companies/:id/files`);
  console.log(`  GET /api/companies/:id/files?file=0`);
});