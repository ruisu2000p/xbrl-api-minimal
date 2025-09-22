const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_LOCAL_SERVICE_KEY environment variable is required');
  console.log('Please set it using:');
  console.log('export SUPABASE_LOCAL_SERVICE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageContents() {
  console.log('🔍 Checking storage contents...\n');

  // 1. List FY2024 directory
  const { data: fyData, error: fyError } = await supabase.storage
    .from('markdown-files')
    .list('FY2024');

  if (fyError) {
    console.error('Error listing FY2024:', fyError);
    return;
  }

  console.log(`📁 FY2024 contains ${fyData.length} company directories:`);

  for (const company of fyData) {
    console.log(`\n  📂 ${company.name}`);

    // List document types in each company
    const { data: docTypes, error: docError } = await supabase.storage
      .from('markdown-files')
      .list(`FY2024/${company.name}`);

    if (!docError && docTypes) {
      for (const docType of docTypes) {
        console.log(`    📄 ${docType.name}/`);

        // List files in each document type
        const { data: files, error: filesError } = await supabase.storage
          .from('markdown-files')
          .list(`FY2024/${company.name}/${docType.name}`);

        if (!filesError && files) {
          console.log(`       Contains ${files.length} files`);
          // Show first 2 files
          files.slice(0, 2).forEach(file => {
            console.log(`       - ${file.name}`);
          });
          if (files.length > 2) {
            console.log(`       ... and ${files.length - 2} more files`);
          }
        }
      }
    }
  }

  // 2. Get public URLs for sample files
  console.log('\n\n📌 Sample Public URLs:');

  const samplePaths = [
    'FY2024/60cd06aad8e8e17db6646ad75169a2d5/PublicDoc_markdown/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
    'FY2024/9bb3cd28be733ab3d9f2b178ea25fee8/AuditDoc_markdown/jpaud-aai-cc-001_E05209-000_2024-03-31_01_2024-06-24_ixbrl.md'
  ];

  for (const path of samplePaths) {
    const { data } = supabase.storage
      .from('markdown-files')
      .getPublicUrl(path);

    console.log(`\n  📎 ${path.split('/').pop()}`);
    console.log(`     ${data.publicUrl}`);
  }

  // 3. Test downloading a file
  console.log('\n\n📥 Testing file download:');
  const testPath = 'FY2024/60cd06aad8e8e17db6646ad75169a2d5/PublicDoc_markdown/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md';

  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('markdown-files')
    .download(testPath);

  if (downloadError) {
    console.error('Download error:', downloadError);
  } else {
    const content = await downloadData.text();
    console.log(`  ✅ Successfully downloaded: ${testPath}`);
    console.log(`  📄 Content preview (first 200 chars):`);
    console.log(`     "${content.substring(0, 200)}..."`);
  }
}

checkStorageContents().catch(console.error);