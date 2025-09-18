/**
 * Production Deployment Configuration
 * Vercel & Supabase Production Settings
 */

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  vercel: {
    projectName: string;
    teamId?: string;
    regions: string[];
    functions: {
      maxDuration: number;
      memory: number;
    };
    env: Record<string, string>;
  };
  supabase: {
    projectId: string;
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  monitoring: {
    sentry?: {
      dsn: string;
      environment: string;
      tracesSampleRate: number;
    };
    analytics?: {
      googleAnalyticsId?: string;
      mixpanelToken?: string;
    };
  };
  cdn: {
    enabled: boolean;
    provider: 'cloudflare' | 'fastly' | 'cloudfront';
    zones: string[];
  };
  security: {
    cors: {
      allowedOrigins: string[];
      allowedMethods: string[];
      allowedHeaders: string[];
      maxAge: number;
    };
    rateLimit: {
      enabled: boolean;
      provider: 'redis' | 'memory' | 'supabase';
      redisUrl?: string;
    };
    waf: {
      enabled: boolean;
      rules: string[];
    };
  };
  scaling: {
    autoScale: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
  };
}

export const PRODUCTION_CONFIG: DeploymentConfig = {
  environment: 'production',

  vercel: {
    projectName: 'xbrl-api-minimal',
    teamId: process.env.VERCEL_TEAM_ID,
    regions: ['hnd1', 'iad1'], // Tokyo and US East
    functions: {
      maxDuration: 60, // seconds
      memory: 1024, // MB
    },
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://api.xbrl-data.com',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  },

  supabase: {
    projectId: 'wpwqxhyiglbtlaimrjrx',
    url: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      environment: 'production',
      tracesSampleRate: 0.1, // 10% of transactions
    },
    analytics: {
      googleAnalyticsId: process.env.GA_MEASUREMENT_ID,
      mixpanelToken: process.env.MIXPANEL_TOKEN,
    },
  },

  cdn: {
    enabled: true,
    provider: 'cloudflare',
    zones: ['asia', 'north-america', 'europe'],
  },

  security: {
    cors: {
      allowedOrigins: [
        'https://xbrl-data.com',
        'https://www.xbrl-data.com',
        'https://app.xbrl-data.com',
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Request-Id',
      ],
      maxAge: 86400, // 24 hours
    },
    rateLimit: {
      enabled: true,
      provider: 'redis',
      redisUrl: process.env.REDIS_URL,
    },
    waf: {
      enabled: true,
      rules: [
        'block-sql-injection',
        'block-xss',
        'block-common-exploits',
        'rate-limit-aggressive',
      ],
    },
  },

  scaling: {
    autoScale: true,
    minInstances: 2,
    maxInstances: 10,
    targetCpuUtilization: 70,
  },
};

/**
 * Staging Configuration
 */
export const STAGING_CONFIG: DeploymentConfig = {
  ...PRODUCTION_CONFIG,
  environment: 'staging',
  vercel: {
    ...PRODUCTION_CONFIG.vercel,
    projectName: 'xbrl-api-minimal-staging',
    env: {
      ...PRODUCTION_CONFIG.vercel.env,
      NODE_ENV: 'staging',
      NEXT_PUBLIC_APP_URL: 'https://staging.xbrl-data.com',
    },
  },
  monitoring: {
    ...PRODUCTION_CONFIG.monitoring,
    sentry: {
      ...PRODUCTION_CONFIG.monitoring.sentry!,
      environment: 'staging',
      tracesSampleRate: 1.0, // 100% for debugging
    },
  },
  scaling: {
    ...PRODUCTION_CONFIG.scaling,
    minInstances: 1,
    maxInstances: 3,
  },
};

/**
 * Get configuration for environment
 */
export function getDeploymentConfig(
  env: 'development' | 'staging' | 'production' = 'production'
): DeploymentConfig {
  switch (env) {
    case 'staging':
      return STAGING_CONFIG;
    case 'production':
      return PRODUCTION_CONFIG;
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}