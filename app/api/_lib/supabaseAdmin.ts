/**
 * Supabase Admin Client (Server-only)
 * Service Roleキーを使用して全てのRLSをバイパス
 */

import { createClient } from '@supabase/supabase-js';

// Only log warning in development, don't throw error
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Missing Supabase environment variables');
}

// Create admin client function to be called when needed
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Export a dummy admin object for compatibility
// It will be replaced by getAdminClient() in actual usage
export const admin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  : null as any;

// Database types
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  key_hash: string;
  masked_key: string | null;
  scopes: string[];
  revoked: boolean;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export interface Document {
  id: string;
  owner_id: string | null;
  path: string;
  title: string | null;
  company_code: string | null;
  company_name: string | null;
  fiscal_year: string | null;
  doc_type: string | null;
  storage_key: string;
  file_size: number | null;
  content_hash: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ApiAccessLog {
  id: string;
  api_key_id: string;
  user_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}