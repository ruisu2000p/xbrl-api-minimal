import { supabaseManager } from '../infrastructure/supabase-singleton';
import { UnifiedAuthManager } from '../security/auth-manager';
import { AppError, ErrorCode } from '../infrastructure/error-handler';
import { logger } from '../utils/logger';
import { User, ApiKey, DashboardData, UsageStats } from '../types';

/**
 * User Service
 * Business logic for user and authentication operations
 */
export class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Register new user
   */
  async registerUser(data: {
    email: string;
    password: string;
    name?: string;
    company?: string;
    plan?: string;
  }): Promise<User> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseManager
        .getClient()
        .auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              company: data.company,
            },
          },
        });

      if (authError) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          authError.message,
          400
        );
      }

      if (!authData.user) {
        throw new AppError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create user',
          500
        );
      }

      // Create user profile
      const { data: user } = await supabaseManager.executeQuery<{
        data: User | null;
      }>(async (client) => {
        return await client
          .from('users')
          .insert({
            id: authData.user!.id,
            email: data.email,
            name: data.name,
            company: data.company,
            plan: data.plan || 'free',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
      });

      if (!user) {
        throw new AppError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to persist user profile',
          500
        );
      }

      logger.info('User registered', { userId: user.id, email: user.email });

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('User registration failed', error);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Registration failed',
        500
      );
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(
    email: string,
    password: string
  ): Promise<{ user: User; session: any }> {
    try {
      const { data, error } = await supabaseManager
        .getClient()
        .auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          'Invalid credentials',
          401
        );
      }

      // Get user profile
      const user = await this.getUserById(data.user!.id);

      logger.info('User authenticated', { userId: user.id });

      return {
        user,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Authentication failed', error);
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        'Authentication failed',
        401
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const { data: user } = await supabaseManager.executeQuery<{
        data: User | null;
      }>(async (client) => {
        return await client
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
      });

      if (!user) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'User not found',
          404
        );
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Failed to get user', { userId, error });
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Failed to retrieve user',
        500
      );
    }
  }

  /**
   * Create API key for user
   */
  async createApiKey(
    userId: string,
    name?: string,
    expiresInDays?: number
  ): Promise<{ apiKey: string; keyId: string; keyData: ApiKey }> {
    try {
      // Generate secure API key using unified auth manager
      const { apiKey, keyId } = await UnifiedAuthManager.createApiKey(
        userId,
        name
      );

      // Calculate expiry
      let expiresAt: string | undefined;
      if (expiresInDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expiresInDays);
        expiresAt = expiry.toISOString();
      }

      // Get the created key data
      const { data: keyRecord } = await supabaseManager.executeQuery<{
        data: ApiKey | null;
      }>(async (client) => {
        return await client
          .from('api_keys')
          .select('*')
          .eq('id', keyId)
          .single();
      });

      if (!keyRecord) {
        throw new AppError(
          ErrorCode.DATABASE_ERROR,
          'Failed to load API key metadata',
          500
        );
      }

      // Update expiry if specified
      let keyData = keyRecord;
      if (expiresAt) {
        await supabaseManager.executeQuery<any>(async (client) => {
          return await client
            .from('api_keys')
            .update({ expires_at: expiresAt })
            .eq('id', keyId);
        });
        keyData = { ...keyData, expires_at: expiresAt };
      }

      logger.info('API key created', { userId, keyId });

      return {
        apiKey, // This is the actual key to give to user
        keyId,
        keyData, // Metadata about the key
      };
    } catch (error) {
      logger.error('Failed to create API key', { userId, error });
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create API key',
        500
      );
    }
  }

  /**
   * List user's API keys
   */
  async listApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const { data: keys } = await supabaseManager.executeQuery<{
        data: ApiKey[] | null;
      }>(async (client) => {
        return await client
          .from('api_keys')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      });

      return keys || [];
    } catch (error) {
      logger.error('Failed to list API keys', { userId, error });
      return [];
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    try {
      await supabaseManager.executeQuery(async (client) => {
        return await client
          .from('api_keys')
          .delete()
          .eq('id', keyId)
          .eq('user_id', userId);
      });

      logger.info('API key revoked', { userId, keyId });
    } catch (error) {
      logger.error('Failed to revoke API key', { userId, keyId, error });
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Failed to revoke API key',
        500
      );
    }
  }

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId: string): Promise<DashboardData> {
    try {
      // Get user
      const user = await this.getUserById(userId);

      // Get API keys
      const apiKeys = await this.listApiKeys(userId);

      // Get usage stats
      const usage = await this.getUserUsageStats(userId);

      return {
        user,
        api_keys: apiKeys,
        usage,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Failed to get dashboard data', { userId, error });
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve dashboard data',
        500
      );
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserUsageStats(userId: string): Promise<UsageStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get API key IDs for user
      const apiKeys = await this.listApiKeys(userId);
      const keyIds = apiKeys.map(k => k.id);

      if (keyIds.length === 0) {
        return {
          total_requests: 0,
          requests_today: 0,
          requests_this_month: 0,
        };
      }

      // Count total requests
      const { data: totalRows } = await supabaseManager.executeQuery<{
        data: { usage_count: number | null }[] | null;
      }>(async (client) => {
        return await client
          .from('api_keys')
          .select('usage_count')
          .in('id', keyIds);
      });

      const total_requests = (totalRows || []).reduce(
        (sum: number, key: any) => sum + (key.usage_count || 0),
        0
      );

      // Count today's requests from security events
      const todayResult = await supabaseManager.executeQuery<number>(async (client) => {
        const result = await client
          .from('security_events')
          .select('id', { count: 'exact' })
          .in('api_key_id', keyIds)
          .eq('event_type', 'auth_success')
          .gte('created_at', todayStart.toISOString());
        return result.count || 0;
      });

      // Count this month's requests
      const monthResult = await supabaseManager.executeQuery<number>(async (client) => {
        const result = await client
          .from('security_events')
          .select('id', { count: 'exact' })
          .in('api_key_id', keyIds)
          .eq('event_type', 'auth_success')
          .gte('created_at', monthStart.toISOString());
        return result.count || 0;
      });

      return {
        total_requests,
        requests_today: todayResult,
        requests_this_month: monthResult,
      };
    } catch (error) {
      logger.error('Failed to get usage stats', { userId, error });
      return {
        total_requests: 0,
        requests_today: 0,
        requests_this_month: 0,
      };
    }
  }

  /**
   * Update user plan
   */
  async updateUserPlan(userId: string, plan: string): Promise<User> {
    try {
      const { data: user } = await supabaseManager.executeQuery<{
        data: User | null;
      }>(async (client) => {
        return await client
          .from('users')
          .update({
            plan,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
      });

      if (!user) {
        throw new AppError(
          ErrorCode.DATABASE_ERROR,
          'Failed to update plan',
          500
        );
      }

      logger.info('User plan updated', { userId, plan });

      return user;
    } catch (error) {
      logger.error('Failed to update user plan', { userId, plan, error });
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Failed to update plan',
        500
      );
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance();