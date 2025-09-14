// Test Supabase Storage directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

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

    // 2. List files in markdown-files bucket (root level)
    console.log('\n2. Listing root directory of markdown-files:');
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('markdown-files')
      .list('', {
        limit: 10
      });

    if (rootError) {
      console.error('Error listing root:', rootError);
    } else {
      console.log('Root contents:', rootFiles?.length || 0, 'items');
      if (rootFiles && rootFiles.length > 0) {
        rootFiles.forEach(item => {
          console.log(`  - ${item.name} (${item.id ? 'folder' : 'file'})`);
        });
      }
    }

    // 3. List FY2020 directory
    console.log('\n3. Listing FY2020 directory:');
    const { data: fy2020Files, error: fy2020Error } = await supabase.storage
      .from('markdown-files')
      .list('FY2020', {
        limit: 5
      });

    if (fy2020Error) {
      console.error('Error listing FY2020:', fy2020Error);
    } else {
      console.log('FY2020 contents:', fy2020Files?.length || 0, 'items');
      if (fy2020Files && fy2020Files.length > 0) {
        fy2020Files.forEach(item => {
          console.log(`  - ${item.name}`);
        });
      }
    }

    // 4. Try to download a specific file
    const testPath = 'FY2020/S100KLVZ/PublicDoc_markdown/0101010_honbun_jpcrp040300-q3r-001_S100KLVZ_2020-05-31.md';
    console.log('\n4. Attempting to download:', testPath);

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

          if (response.status === 404) {
            console.log('❌ File not found in storage!');
          } else if (response.status === 200) {
            console.log('✅ File exists and is accessible via public URL');
            const text = await response.text();
            console.log('File size from public URL:', text.length, 'bytes');
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError.message);
        }
      }
    } else {
      console.log('✅ Download successful!');
      if (downloadData) {
        const text = await downloadData.text();
        console.log('File size:', downloadData.size, 'bytes');
        console.log('First 200 characters:', text.substring(0, 200));
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testStorage();