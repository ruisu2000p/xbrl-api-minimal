// import { NextRequest } from 'next/server'; // Not needed, using standard Request
import { healthCheckService } from '@/lib/infrastructure/health-check';
import { asyncHandler } from '@/lib/infrastructure/error-handler';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/health - Health check endpoint
 */
export const GET = asyncHandler(async (request: Request) => {
  // No authentication required for health check
  const health = await healthCheckService.checkHealth();

  if (health.status === 'unhealthy') {
    return errorResponse('System unhealthy', {
      status: 503,
      details: health,
    });
  }

  return successResponse(health, {
    status: health.status === 'degraded' ? 200 : 200,
  });
});

/**
 * GET /api/health/ready - Readiness probe (for k8s)
 */
export async function HEAD(request: Request) {
  const isReady = await healthCheckService.isReady();
  return new Response(null, {
    status: isReady ? 200 : 503,
  });
}