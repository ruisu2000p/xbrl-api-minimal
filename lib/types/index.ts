// 企業データの型定義
export interface Company {
  id: string;
  company_id: string;
  company_name: string;
  ticker_code?: string;
  sector?: string;
  market?: string;
  fiscal_year: string;
  created_at?: string;
  updated_at?: string;
}

// APIレスポンスの型定義
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

// ページネーションの型定義
export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sector?: string;
  fiscal_year?: string;
}

// ユーザー認証の型定義
export interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  plan: 'free' | 'basic' | 'pro';
  created_at: string;
}

// ファイルメタデータの型定義
export interface FileMetadata {
  company_id: string;
  company_name: string;
  fiscal_year: string;
  storage_path: string;
  document_type: 'PublicDoc' | 'AuditDoc';
  file_size?: number;
  has_tables?: boolean;
}

// フォームエラーの型定義
export interface FormErrors {
  [key: string]: string;
}

// 認証フォームデータの型定義
export interface AuthFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  plan: 'free' | 'basic' | 'pro';
}