// Test Supabase Storage directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorage() {
  console.log('Testing Supabase Storage...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...\n');

  try {
    // 1. List buckets
    console.log('1. Listing buckets:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name));
    }

    // 2. List files in markdown-files bucket
    console.log('\n2. Listing files in markdown-files bucket:');
    const { data: files, error: filesError } = await supabase.storage
      .from('markdown-files')
      .list('FY2020/S100KLVZ/PublicDoc_markdown', {
        limit: 5,
        offset: 0
      });

    if (filesError) {
      console.error('Error listing files:', filesError);
    } else {
      console.log('Files found:', files?.length || 0);
      if (files && files.length > 0) {
        files.forEach(file => {
          console.log(`  - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
        });
      }
    }

    // 3. Try to download a specific file
    const testPath = 'FY2020/S100KLVZ/PublicDoc_markdown/0101010_honbun_jpcrp040300-q3r-001_S100KLVZ_2020-05-31.md';
    console.log('\n3. Attempting to download:', testPath);

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('markdown-files')
      .download(testPath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      console.error('Error details:', JSON.stringify(downloadError, null, 2));

      // Try public URL
      const { data: publicUrlData } = supabase.storage
        .from('markdown-files')
        .getPublicUrl(testPath);

      console.log('\nPublic URL:', publicUrlData?.publicUrl);

      // Try to fetch the public URL
      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl);
          console.log('Public URL response status:', response.status);
          console.log('Public URL response headers:', response.headers.raw());

          if (response.status === 404) {
            console.log('File not found in storage!');
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError.message);
        }
      }
    } else {
      console.log('Download successful!');
      if (downloadData) {
        const text = await downloadData.text();
        console.log('File size:', downloadData.size, 'bytes');
        console.log('First 200 characters:', text.substring(0, 200));
      }
    }

    // 4. Check if bucket exists and is accessible
    console.log('\n4. Checking bucket configuration:');
    const { data: bucketData } = await supabase.storage.getBucket('markdown-files');
    if (bucketData) {
      console.log('Bucket info:', bucketData);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testStorage();