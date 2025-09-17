import { supabaseManager } from '../infrastructure/supabase-singleton';
import { cacheManager } from '../infrastructure/cache-manager';
import { AppError, ErrorCode } from '../infrastructure/error-handler';
import { logger } from '../utils/logger';
import { Company, CompanyData, CompanySearchParams } from '../types';

/**
 * Company Service
 * Business logic layer for company-related operations
 */
export class CompanyService {
  private static instance: CompanyService;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): CompanyService {
    if (!CompanyService.instance) {
      CompanyService.instance = new CompanyService();
    }
    return CompanyService.instance;
  }

  /**
   * Search companies with advanced filtering
   */
  async searchCompanies(params: CompanySearchParams): Promise<{
    data: Company[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  }> {
    const cacheKey = `companies:search:${JSON.stringify(params)}`;

    // Try cache first
    const cached = cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { page = 1, per_page = 20, search, sector, fiscal_year } = params;
      const offset = (page - 1) * per_page;

      const result = await supabaseManager.executeQuery<{
        data: Company[] | null;
        count: number | null;
        error: any;
      }>(async (client) => {
        let query = client
          .from('companies')
          .select('*', { count: 'exact' });

        // Apply filters
        if (search) {
          query = query.or(`company_name.ilike.%${search}%,ticker_code.ilike.%${search}%`);
        }

        if (sector) {
          query = query.eq('sector', sector);
        }

        if (fiscal_year) {
          query = query.eq('fiscal_year', fiscal_year);
        }

        // Apply pagination and sorting
        query = query
          .range(offset, offset + per_page - 1)
          .order('company_name', { ascending: true });

        return await query;
      });

      const response = {
        data: result.data || [],
        pagination: {
          page,
          per_page,
          total: result.count || 0,
          total_pages: Math.ceil((result.count || 0) / per_page),
        },
      };

      // Cache the result
      cacheManager.set(cacheKey, response, this.CACHE_TTL);

      logger.info('Companies searched', {
        count: response.data.length,
        params,
      });

      return response;
    } catch (error) {
      logger.error('Failed to search companies', error);
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Failed to search companies',
        500
      );
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<CompanyData> {
    const cacheKey = `company:${id}`;

    // Try cache first
    const cached = cacheManager.get<CompanyData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get company details
      const { data: company } = await supabaseManager.executeQuery<{
        data: Company | null;
      }>(async (client) => {
        return await client
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();
      });

      if (!company) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          `Company with ID ${id} not found`,
          404
        );
      }

      // Get associated files from metadata
      const files = await this.getCompanyFiles(id);

      const companyData: CompanyData = {
        ...company,
        file_count: files.length,
        has_tables: files.some(f => f.has_tables),
      };

      // Cache the result
      cacheManager.set(cacheKey, companyData, this.CACHE_TTL);

      return companyData;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Failed to get company', { id, error });
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Failed to retrieve company',
        500
      );
    }
  }

  /**
   * Get company files
   */
  async getCompanyFiles(companyId: string): Promise<any[]> {
    const cacheKey = `company:${companyId}:files`;

    // Try cache first
    const cached = cacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data: files } = await supabaseManager.executeQuery<{
        data: any[] | null;
      }>(async (client) => {
        return await client
          .from('markdown_files_metadata')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
      });

      // Cache the result
      cacheManager.set(cacheKey, files || [], this.CACHE_TTL);

      return files || [];
    } catch (error) {
      logger.error('Failed to get company files', { companyId, error });
      return [];
    }
  }

  /**
   * Get company document content
   */
  async getCompanyDocument(
    companyId: string,
    documentType: 'PublicDoc' | 'AuditDoc',
    fileName: string
  ): Promise<string> {
    const cacheKey = `document:${companyId}:${documentType}:${fileName}`;

    // Try cache first
    const cached = cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get file metadata
      const { data: metadata } = await supabaseManager.executeQuery<{
        data: { storage_path: string | null } | null;
      }>(async (client) => {
        return await client
          .from('markdown_files_metadata')
          .select('storage_path')
          .eq('company_id', companyId)
          .eq('document_type', documentType)
          .eq('file_name', fileName)
          .single();
      });

      if (!metadata?.storage_path) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'Document not found',
          404
        );
      }

      // Download from storage
      const content = await supabaseManager.storageOperation<Blob>(
        'download',
        'markdown-files',
        metadata.storage_path
      );

      const text = await content.text();

      // Cache for longer (documents don't change often)
      cacheManager.set(cacheKey, text, this.CACHE_TTL * 2);

      return text;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Failed to get document', {
        companyId,
        documentType,
        fileName,
        error,
      });
      throw new AppError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve document',
        500
      );
    }
  }

  /**
   * Get available sectors
   */
  async getSectors(): Promise<string[]> {
    const cacheKey = 'sectors:all';

    // Try cache first
    const cached = cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await supabaseManager.executeQuery<{ data: any[] | null }>(async (client) => {
        return await client
          .from('companies')
          .select('sector')
          .not('sector', 'is', null)
          .order('sector');
      });

      const sectors = [...new Set((result.data || []).map((r: any) => r.sector))];

      // Cache for longer
      cacheManager.set(cacheKey, sectors, this.CACHE_TTL * 4);

      return sectors;
    } catch (error) {
      logger.error('Failed to get sectors', error);
      return [];
    }
  }

  /**
   * Get available fiscal years
   */
  async getFiscalYears(): Promise<string[]> {
    const cacheKey = 'fiscal_years:all';

    // Try cache first
    const cached = cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await supabaseManager.executeQuery<{ data: any[] | null }>(async (client) => {
        return await client
          .from('companies')
          .select('fiscal_year')
          .not('fiscal_year', 'is', null)
          .order('fiscal_year', { ascending: false });
      });

      const years = [...new Set((result.data || []).map((r: any) => r.fiscal_year))];

      // Cache for longer
      cacheManager.set(cacheKey, years, this.CACHE_TTL * 4);

      return years;
    } catch (error) {
      logger.error('Failed to get fiscal years', error);
      return [];
    }
  }

  /**
   * Clear cache for company
   */
  clearCompanyCache(companyId?: string): void {
    if (companyId) {
      cacheManager.clearPattern(`company:${companyId}`);
      cacheManager.clearPattern(`document:${companyId}`);
    } else {
      cacheManager.clearPattern('companies:');
      cacheManager.clearPattern('company:');
      cacheManager.clearPattern('document:');
      cacheManager.clearPattern('sectors:');
      cacheManager.clearPattern('fiscal_years:');
    }
  }
}

// Export singleton instance
export const companyService = CompanyService.getInstance();