export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { SecurityMiddleware } from '@/lib/security/security-middleware';
import { companyService } from '@/lib/services/company-service';
import { asyncHandler } from '@/lib/infrastructure/error-handler';
import { successResponse } from '@/lib/utils/api-response';

/**
 * GET /api/v1/companies/[id] - Get company details
 */
export const GET = asyncHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Apply security middleware
  const securityResponse = await SecurityMiddleware.apply(request, {
    requireAuth: true,
    rateLimit: { enabled: true }
  });

  if (securityResponse) {
    return securityResponse;
  }

  // Get company details
  const company = await companyService.getCompanyById(params.id);

  return successResponse(company);
});