// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { SecurityMiddleware } from '@/lib/security/security-middleware';
import { companyService } from '@/lib/services/company-service';
import { successResponse } from '@/lib/utils/api-response';
import { CompanySearchParams } from '@/lib/types';

/**
 * GET /api/v1/companies - Search companies
 */
export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await SecurityMiddleware.apply(request, {
      requireAuth: true,
      rateLimit: { enabled: true }
    });

    if (securityResponse) {
      return securityResponse;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');

    const params: CompanySearchParams = {
      page: page < 1 ? 1 : page,
      per_page: perPage < 1 || perPage > 100 ? 20 : perPage,
      search: searchParams.get('search') || undefined,
      sector: searchParams.get('sector') || undefined,
      fiscal_year: searchParams.get('fiscal_year') || undefined,
    };

    // Search companies using service layer
    const result = await companyService.searchCompanies(params);

    return successResponse(result.data, {
      metadata: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    // Error handling
    const { errorHandler } = await import('@/lib/infrastructure/error-handler');
    const requestId = request.headers.get('x-request-id') || undefined;
    return errorHandler.handleError(error, requestId);
  }
}