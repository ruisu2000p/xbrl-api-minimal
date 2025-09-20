const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  try {
    // 1. List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw bucketsError;
    console.log('✅ Buckets found:', buckets.map(b => b.name));

    // 2. Upload test file
    const testContent = '# Test Markdown\n\nThis is a test file for storage.';
    const fileName = 'test/test-file.md';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('markdown-files')
      .upload(fileName, testContent, {
        contentType: 'text/markdown',
        upsert: true
      });

    if (uploadError) throw uploadError;
    console.log('✅ File uploaded successfully:', fileName);

    // 3. List files in bucket
    const { data: files, error: listError } = await supabase.storage
      .from('markdown-files')
      .list('test');

    if (listError) throw listError;
    console.log('✅ Files in bucket:', files.map(f => f.name));

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from('markdown-files')
      .getPublicUrl(fileName);

    console.log('✅ Public URL:', urlData.publicUrl);

    // 5. Download file
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('markdown-files')
      .download(fileName);

    if (downloadError) throw downloadError;
    const text = await downloadData.text();
    console.log('✅ Downloaded content:', text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStorage();