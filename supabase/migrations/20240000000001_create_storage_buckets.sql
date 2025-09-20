-- Create storage buckets for XBRL API

-- Insert the markdown-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('markdown-files', 'markdown-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'markdown-files');

CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'markdown-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow service role full access" ON storage.objects
  USING (bucket_id = 'markdown-files' AND auth.role() = 'service_role');

-- Allow public access to the bucket itself
UPDATE storage.buckets
SET public = true
WHERE id = 'markdown-files';