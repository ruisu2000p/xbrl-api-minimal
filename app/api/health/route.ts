const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const STARTED_AT = Date.now();

type CheckStatus = 'pass' | 'warn' | 'fail';

function evaluateEnvironment(): { status: CheckStatus; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length === 0) {
    return { status: 'pass', missing };
  }

  if (missing.length === REQUIRED_ENV_VARS.length) {
    return { status: 'fail', missing };
  }

  return { status: 'warn', missing };
}

function buildHealthPayload() {
  const envCheck = evaluateEnvironment();

  const uptimeSeconds = Math.round(process.uptime());
  const memoryUsage = process.memoryUsage();

  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
    envCheck.status === 'fail'
      ? 'unhealthy'
      : envCheck.status === 'warn'
        ? 'degraded'
        : 'healthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? 'unknown',
    checks: {
      environment: {
        status: envCheck.status,
        missing: envCheck.missing,
      },
      process: {
        status: 'pass' as const,
        uptimeSeconds,
        startedAt: new Date(STARTED_AT).toISOString(),
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
        },
      },
    },
  };
}

export async function GET() {
  const health = buildHealthPayload();
  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return Response.json(health, { status: statusCode });
}

export async function HEAD() {
  const envCheck = evaluateEnvironment();
  const ready = envCheck.status !== 'fail';

  return new Response(null, { status: ready ? 200 : 503 });
}
