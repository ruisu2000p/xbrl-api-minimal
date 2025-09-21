export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  tier: 'free' | 'basic' | 'premium';
}

export interface ApiKeyResponse {
  success: boolean;
  data?: ApiKey | ApiKey[];
  error?: string;
}

export interface ApiKeyCreateRequest {
  name: string;
}

export interface ApiKeyDeleteRequest {
  keyId: string;
}