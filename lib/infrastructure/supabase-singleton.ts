import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

/**
 * Supabase Client Singleton
 * Ensures single instance and consistent configuration across the application
 */
export class SupabaseManager {
  private static instance: SupabaseManager;
  private client: SupabaseClient | null = null;
  private serviceClient: SupabaseClient | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SupabaseManager {
    if (!SupabaseManager.instance) {
      SupabaseManager.instance = new SupabaseManager();
    }
    return SupabaseManager.instance;
  }

  /**
   * Get Supabase client (anon key)
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        throw new Error('Supabase configuration missing. Check environment variables.');
      }

      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'xbrl-api-minimal/4.0',
          },
        },
      });

      logger.info('Supabase client initialized (anon)');
    }

    return this.client;
  }

  /**
   * Get Supabase service client (service role key)
   */
  getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        throw new Error('Supabase service configuration missing. Check environment variables.');
      }

      this.serviceClient = createClient(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'xbrl-api-minimal-service/4.0',
          },
        },
      });

      logger.info('Supabase service client initialized');
    }

    return this.serviceClient;
  }

  /**
   * Execute database query with retry logic
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<any>,
    options: {
      useServiceRole?: boolean;
      retries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const { useServiceRole = false, retries = 3, retryDelay = 1000 } = options;
    const client = useServiceRole ? this.getServiceClient() : this.getClient();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await queryFn(client);

        if (result.error) {
          throw new Error(result.error.message);
        }

        return result.data as T;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Query attempt ${attempt} failed:`, error);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    logger.error('All query attempts failed', lastError);
    throw lastError;
  }

  /**
   * Storage operations wrapper
   */
  async storageOperation<T>(
    operation: 'upload' | 'download' | 'delete' | 'list',
    bucket: string,
    path?: string,
    data?: any,
    options?: any
  ): Promise<T> {
    const client = this.getServiceClient();
    const storage = client.storage.from(bucket);

    try {
      let result;

      switch (operation) {
        case 'upload':
          if (!path || !data) {
            throw new Error('Path and data required for upload');
          }
          result = await storage.upload(path, data, options);
          break;

        case 'download':
          if (!path) {
            throw new Error('Path required for download');
          }
          result = await storage.download(path);
          break;

        case 'delete':
          if (!path) {
            throw new Error('Path required for delete');
          }
          result = await storage.remove([path]);
          break;

        case 'list':
          result = await storage.list(path, options);
          break;

        default:
          throw new Error(`Unknown storage operation: ${operation}`);
      }

      if (result.error) {
        throw result.error;
      }

      return result.data as T;
    } catch (error) {
      logger.error(`Storage operation failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    database: boolean;
    storage: boolean;
    auth: boolean;
  }> {
    const health = {
      database: false,
      storage: false,
      auth: false,
    };

    try {
      // Check database
      const { error: dbError } = await this.getClient()
        .from('companies')
        .select('id')
        .limit(1);
      health.database = !dbError;
    } catch (error) {
      logger.error('Database health check failed', error);
    }

    try {
      // Check storage
      const { error: storageError } = await this.getServiceClient()
        .storage
        .from('markdown-files')
        .list('', { limit: 1 });
      health.storage = !storageError;
    } catch (error) {
      logger.error('Storage health check failed', error);
    }

    try {
      // Check auth
      const { error: authError } = await this.getClient()
        .auth
        .getSession();
      health.auth = !authError;
    } catch (error) {
      logger.error('Auth health check failed', error);
    }

    return health;
  }

  /**
   * Reset connections (for testing or error recovery)
   */
  reset(): void {
    this.client = null;
    this.serviceClient = null;
    logger.info('Supabase connections reset');
  }
}

// Export singleton instance
export const supabaseManager = SupabaseManager.getInstance();