import { supabaseManager } from './supabase-singleton';
import { configManager } from './config-manager';
import { logger } from '../utils/logger';

/**
 * Health Check Service
 * Monitors system health and dependencies
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    storage: CheckResult;
    auth: CheckResult;
    config: CheckResult;
    memory: CheckResult;
  };
  metrics?: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      storage: await this.checkStorage(),
      auth: await this.checkAuth(),
      config: this.checkConfig(),
      memory: this.checkMemory(),
    };

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: configManager.getConfig().app.version,
      checks,
      metrics: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage(),
        responseTime: this.calculateAverageResponseTime(checks),
      },
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const result = await supabaseManager.executeQuery(
        async (client) => {
          return await client
            .from('companies')
            .select('count')
            .limit(1)
            .single();
        },
        { retries: 1 }
      );

      const responseTime = Date.now() - start;

      if (responseTime > 1000) {
        return {
          status: 'warn',
          message: 'Database response time is slow',
          responseTime,
        };
      }

      return {
        status: 'pass',
        responseTime,
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        status: 'fail',
        message: 'Database connection failed',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check storage accessibility
   */
  private async checkStorage(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const result = await supabaseManager.storageOperation(
        'list',
        'markdown-files',
        '',
        undefined,
        { limit: 1 }
      );

      const responseTime = Date.now() - start;

      return {
        status: 'pass',
        responseTime,
      };
    } catch (error) {
      logger.error('Storage health check failed', error);
      return {
        status: 'fail',
        message: 'Storage access failed',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check auth service
   */
  private async checkAuth(): Promise<CheckResult> {
    const start = Date.now();

    try {
      // Simple auth check - verify service can be reached
      const client = supabaseManager.getClient();
      const { error } = await client.auth.getSession();

      const responseTime = Date.now() - start;

      // Not having a session is fine, we just check connectivity
      if (error && error.message !== 'No session') {
        return {
          status: 'fail',
          message: 'Auth service error',
          responseTime,
        };
      }

      return {
        status: 'pass',
        responseTime,
      };
    } catch (error) {
      logger.error('Auth health check failed', error);
      return {
        status: 'fail',
        message: 'Auth service unreachable',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check configuration validity
   */
  private checkConfig(): CheckResult {
    try {
      const config = configManager.getConfig();

      // Check critical configuration
      if (!config.supabase.url || !config.security.apiKeySecret) {
        return {
          status: 'fail',
          message: 'Critical configuration missing',
        };
      }

      // Warn about non-production settings in production
      if (config.app.env === 'production') {
        if (config.monitoring.logLevel === 'debug') {
          return {
            status: 'warn',
            message: 'Debug logging enabled in production',
          };
        }
      }

      return {
        status: 'pass',
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Configuration error',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): CheckResult {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 90) {
      return {
        status: 'fail',
        message: `High memory usage: ${usagePercent.toFixed(1)}%`,
      };
    }

    if (usagePercent > 75) {
      return {
        status: 'warn',
        message: `Elevated memory usage: ${usagePercent.toFixed(1)}%`,
      };
    }

    return {
      status: 'pass',
      message: `Memory usage: ${usagePercent.toFixed(1)}%`,
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    checks: Record<string, CheckResult>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const checkValues = Object.values(checks);

    if (checkValues.some((check) => check.status === 'fail')) {
      return 'unhealthy';
    }

    if (checkValues.some((check) => check.status === 'warn')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(
    checks: Record<string, CheckResult>
  ): number {
    const times = Object.values(checks)
      .filter((check) => check.responseTime !== undefined)
      .map((check) => check.responseTime!);

    if (times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Get simple health status (for quick checks)
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get readiness status (for k8s readiness probe)
   */
  async isReady(): Promise<boolean> {
    try {
      const dbCheck = await this.checkDatabase();
      const configCheck = this.checkConfig();

      return (
        dbCheck.status !== 'fail' &&
        configCheck.status !== 'fail'
      );
    } catch {
      return false;
    }
  }

  /**
   * Get liveness status (for k8s liveness probe)
   */
  isAlive(): boolean {
    try {
      const memCheck = this.checkMemory();
      return memCheck.status !== 'fail';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();