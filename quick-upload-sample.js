const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Supabase local configuration
const supabaseUrl = process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_LOCAL_SERVICE_KEY environment variable is required');
  console.log('Please set it using:');
  console.log('export SUPABASE_LOCAL_SERVICE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// XBRLデータのベースパス
const BASE_PATH = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発';

// ディレクトリ名をハッシュ化
function hashDirectoryName(dirName) {
  return crypto.createHash('md5').update(dirName).digest('hex');
}

async function uploadSampleFiles() {
  console.log('🚀 Quick sample upload to local Supabase...\n');

  const samples = [
    { fy: 'FY2022', count: 2 },
    { fy: 'FY2023', count: 2 },
    { fy: 'FY2024', count: 2 },
    { fy: 'FY2025', count: 2 }
  ];

  let totalUploaded = 0;

  for (const sample of samples) {
    const fyPath = path.join(BASE_PATH, sample.fy);

    if (!fs.existsSync(fyPath)) {
      console.log(`⚠️  ${sample.fy} not found`);
      continue;
    }

    const companies = fs.readdirSync(fyPath)
      .filter(dir => fs.statSync(path.join(fyPath, dir)).isDirectory())
      .slice(0, sample.count);

    console.log(`\n📁 ${sample.fy}: Uploading ${companies.length} companies`);

    for (const companyDir of companies) {
      const companyPath = path.join(fyPath, companyDir);
      const companyId = companyDir.substring(0, 8);
      const hashedDir = hashDirectoryName(companyDir);
      const companyName = companyDir.substring(9, Math.min(40, companyDir.length));

      console.log(`  🏢 ${companyId} - ${companyName}...`);

      // Upload only first file from each doc type
      const docTypes = ['PublicDoc_markdown', 'AuditDoc_markdown'];

      for (const docType of docTypes) {
        const docPath = path.join(companyPath, docType);

        if (!fs.existsSync(docPath)) continue;

        const files = fs.readdirSync(docPath).filter(f => f.endsWith('.md'));
        if (files.length === 0) continue;

        // Upload first file only
        const file = files[0];
        const filePath = path.join(docPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const storagePath = `${sample.fy}/${hashedDir}/${docType}/${file}`;

        try {
          const { data, error } = await supabase.storage
            .from('markdown-files')
            .upload(storagePath, fileContent, {
              contentType: 'text/markdown',
              upsert: true
            });

          if (error) throw error;
          totalUploaded++;
          console.log(`    ✅ ${docType}/${file.substring(0, 30)}...`);
        } catch (error) {
          console.log(`    ❌ Failed: ${error.message}`);
        }
      }
    }
  }

  // Verify storage contents
  console.log('\n📊 Summary:');
  console.log(`  Total files uploaded: ${totalUploaded}`);

  console.log('\n📦 Storage contents:');
  for (const sample of samples) {
    const { data, error } = await supabase.storage
      .from('markdown-files')
      .list(sample.fy);

    if (!error && data) {
      console.log(`  ${sample.fy}: ${data.length} company directories`);
    }
  }

  // Test public access
  const { data: testList } = await supabase.storage
    .from('markdown-files')
    .list('FY2024', { limit: 1 });

  if (testList && testList.length > 0) {
    const firstCompany = testList[0].name;
    const { data: docTypes } = await supabase.storage
      .from('markdown-files')
      .list(`FY2024/${firstCompany}`);

    if (docTypes && docTypes.length > 0) {
      const { data: files } = await supabase.storage
        .from('markdown-files')
        .list(`FY2024/${firstCompany}/${docTypes[0].name}`, { limit: 1 });

      if (files && files.length > 0) {
        const samplePath = `FY2024/${firstCompany}/${docTypes[0].name}/${files[0].name}`;
        const { data: publicUrl } = supabase.storage
          .from('markdown-files')
          .getPublicUrl(samplePath);

        console.log('\n🌐 Sample public URL:');
        console.log(`  ${publicUrl.publicUrl}`);
      }
    }
  }

  console.log('\n✨ Sample upload completed!');
}

uploadSampleFiles().catch(console.error);