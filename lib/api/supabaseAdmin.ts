/**
 * Supabase Admin Client (Server-only)
 * Service Roleキーを使用して全てのRLSをバイパス
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Admin client with service role key (bypasses RLS)
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Database types
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  revoked: boolean;
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