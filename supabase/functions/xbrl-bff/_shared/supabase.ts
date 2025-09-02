/**
 * Supabase client for XBRL BFF
 * Uses Service Role key for full access
 */

import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required Supabase environment variables');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

// Create Supabase client with service role key
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-source': 'xbrl-bff'
      }
    }
  }
);

// Storage bucket name for markdown files
export const STORAGE_BUCKET = 'markdown-files';

/**
 * Helper to get file metadata from storage
 */
export async function getStorageFileMetadata(path: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(path.substring(0, path.lastIndexOf('/')), {
      limit: 1000,
      search: path.substring(path.lastIndexOf('/') + 1)
    });
    
  if (error) throw error;
  return data?.[0] || null;
}