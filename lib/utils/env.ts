// 環境変数の検証とアクセス

export interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;
  API_KEY_PREFIX: string;
  API_RATE_LIMIT_PER_MIN: number;
}

class EnvValidator {
  private config: Partial<EnvConfig> = {};
  private validated = false;

  constructor() {
    this.validate();
  }

  private validate(): void {
    // 必須の環境変数をチェック
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }

    // 環境変数を設定
    this.config = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'markdown-files',
      API_KEY_PREFIX: process.env.API_KEY_PREFIX || 'xbrl_',
      API_RATE_LIMIT_PER_MIN: parseInt(process.env.API_RATE_LIMIT_PER_MIN || '60', 10)
    };

    // URL形式の検証
    if (this.config.NEXT_PUBLIC_SUPABASE_URL && 
        !this.config.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      console.warn('NEXT_PUBLIC_SUPABASE_URL should start with https://');
    }

    this.validated = true;
  }

  public get(key: keyof EnvConfig): any {
    if (!this.validated) {
      this.validate();
    }
    return this.config[key];
  }

  public getAll(): Partial<EnvConfig> {
    if (!this.validated) {
      this.validate();
    }
    return this.config;
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

// シングルトンインスタンス
export const env = new EnvValidator();

// 便利なエクスポート
export const getSupabaseUrl = () => env.get('NEXT_PUBLIC_SUPABASE_URL');
export const getSupabaseAnonKey = () => env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const getSupabaseServiceKey = () => env.get('SUPABASE_SERVICE_ROLE_KEY');
export const getStorageBucket = () => env.get('SUPABASE_STORAGE_BUCKET');
export const getApiKeyPrefix = () => env.get('API_KEY_PREFIX');
export const getRateLimit = () => env.get('API_RATE_LIMIT_PER_MIN');