/**
 * API型定義
 * すべてのAPIエンドポイントで使用する型を定義
 */

// 認証関連
export interface RegisterRequestBody {
  email: string;
  password: string;
  name: string;
  company?: string;
  plan?: string;
  agreeToTerms?: boolean;
  agreeToDisclaimer?: boolean;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface ApiKeyCreateRequest {
  name?: string;
}

export interface ApiKeyDeleteRequest {
  id: string;
}

// ユーザー情報
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  plan?: string;
  apiKey?: string | null;
  createdAt?: string;
}

// APIレスポンス
export interface AuthSuccessResponse {
  success: true;
  message: string;
  user: UserProfile;
  session?: any;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  masked_key: string;
  tier: string;
  status: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

export interface ApiKeyCreateResponse {
  success: true;
  apiKey: ApiKeyResponse;
  plaintextKey: string; // 初回作成時のみ返される
}

export interface ApiKeyListResponse {
  success: true;
  apiKeys: ApiKeyResponse[];
}
