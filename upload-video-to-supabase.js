// Supabase Storageに動画をアップロードするスクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 環境変数またはハードコード（本番環境では環境変数使用）
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Set it using: SET SUPABASE_SERVICE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadVideo() {
  const videoPath = 'C:\\Users\\pumpk\\Downloads\\無題のビデオ.mp4';
  const fileName = 'demo-video.mp4';

  try {
    // まずはvideoバケットが存在するか確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      return;
    }

    const videoBucket = buckets.find(b => b.name === 'videos');

    if (!videoBucket) {
      console.log('📦 Creating videos bucket...');
      const { error: createError } = await supabase.storage.createBucket('videos', {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      });

      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return;
      }
    }

    // ファイルを読み込む
    console.log('📁 Reading video file...');
    const fileBuffer = fs.readFileSync(videoPath);

    // Supabaseにアップロード
    console.log('⬆️ Uploading to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true // 既存ファイルを上書き
      });

    if (error) {
      console.error('❌ Upload failed:', error);
      return;
    }

    console.log('✅ Upload successful!');
    console.log('📊 File info:', data);

    // 公開URLを生成
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    console.log('\n🌐 Public URL:');
    console.log(urlData.publicUrl);

    console.log('\n📝 Usage in React component:');
    console.log(`<VideoPlayer videoUrl="${urlData.publicUrl}" />`);

    // メタデータをデータベースに保存（オプション）
    const { error: dbError } = await supabase
      .from('video_metadata')
      .upsert({
        file_name: fileName,
        storage_path: data.path,
        public_url: urlData.publicUrl,
        title: 'XBRL API Demo',
        description: 'Demo video showing the new API key system',
        created_at: new Date().toISOString()
      });

    if (dbError && dbError.code !== '42P01') { // テーブルが存在しない場合は無視
      console.warn('⚠️ Could not save metadata:', dbError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

uploadVideo();