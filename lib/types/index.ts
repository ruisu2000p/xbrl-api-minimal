// Company related types
export interface Company {
  id: string;
  company_name: string;
  ticker_code?: string;
  sector?: string;
  fiscal_year?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyData extends Company {
  storage_path?: string;
  document_type?: string;
  file_count?: number;
  has_tables?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface PaginationParams {
  page: number;
  per_page: number;
  search?: string;
  sector?: string;
  fiscal_year?: string;
}

// Auth types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  user_id: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  usage_count: number;
}

// Dashboard types
export interface UsageStats {
  total_requests: number;
  requests_today: number;
  requests_this_month: number;
}

export interface DashboardData {
  user: User;
  api_keys: ApiKey[];
  usage: UsageStats;
}

// Storage types
export interface StorageFile {
  name: string;
  path: string;
  size: number;
  last_modified: string;
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
  bucket_id?: string;
  owner?: string;
  cache_control?: string;
  content_type?: string;
  size?: number;
}

export interface MarkdownDocument {
  company_id: string;
  company_name: string;
  file_name: string;
  content: string;
  fiscal_year: string;
  document_type: 'PublicDoc' | 'AuditDoc';
}

// Request types
export interface CompanySearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  sector?: string;
  fiscal_year?: string;
}

export interface ApiKeyCreateRequest {
  name?: string;
  expires_in_days?: number;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// Auth form types
export interface AuthFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  plan: string;
}

export interface FormErrors {
  [key: string]: string;
}
