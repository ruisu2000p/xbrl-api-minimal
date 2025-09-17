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
  async searchCompanies(params: CompanySearchParams): Promise<{\n    data: Company[];\n    pagination: {\n      page: number;\n      per_page: number;\n      total: number;\n      total_pages: number;\n    };\n  }> {\n    const cacheKey = `companies:search:${JSON.stringify(params)}`;\n\n    // Try cache first\n    const cached = cacheManager.get<any>(cacheKey);\n    if (cached) {\n      return cached;\n    }\n\n    try {\n      const { page = 1, per_page = 20, search, sector, fiscal_year } = params;\n      const offset = (page - 1) * per_page;\n\n      const result = await supabaseManager.executeQuery<Company[]>(async (client) => {\n        let query = client\n          .from('companies')\n          .select('*', { count: 'exact' });\n\n        // Apply filters\n        if (search) {\n          query = query.or(`company_name.ilike.%${search}%,ticker_code.ilike.%${search}%`);\n        }\n\n        if (sector) {\n          query = query.eq('sector', sector);\n        }\n\n        if (fiscal_year) {\n          query = query.eq('fiscal_year', fiscal_year);\n        }\n\n        // Apply pagination and sorting\n        query = query\n          .range(offset, offset + per_page - 1)\n          .order('company_name', { ascending: true });\n\n        return await query;\n      });\n\n      const response = {\n        data: result.data || [],\n        pagination: {\n          page,\n          per_page,\n          total: result.count || 0,\n          total_pages: Math.ceil((result.count || 0) / per_page),\n        },\n      };\n\n      // Cache the result\n      cacheManager.set(cacheKey, response, this.CACHE_TTL);\n\n      logger.info('Companies searched', {\n        count: response.data.length,\n        params,\n      });\n\n      return response;\n    } catch (error) {\n      logger.error('Failed to search companies', error);\n      throw new AppError(\n        ErrorCode.DATABASE_ERROR,\n        'Failed to search companies',\n        500\n      );\n    }\n  }

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
      const company = await supabaseManager.executeQuery<Company>(
        async (client) => {
          const result = await client
            .from('companies')
            .select('*')
            .eq('id', id)
            .single();
          return result;
        }
      );

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
      const result = await supabaseManager.executeQuery<any[]>(async (client) => {
        return await client
          .from('markdown_files_metadata')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
      });

      // Cache the result
      cacheManager.set(cacheKey, result.data || [], this.CACHE_TTL);

      return result.data || [];
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
      const metadata = await supabaseManager.executeQuery<any>(async (client) => {
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
  async getSectors(): Promise<string[]> {\n    const cacheKey = 'sectors:all';\n\n    // Try cache first\n    const cached = cacheManager.get<string[]>(cacheKey);\n    if (cached) {\n      return cached;\n    }\n\n    try {\n      const result = await supabaseManager.executeQuery<{ sector: string }[]>(async (client) => {\n        return await client\n          .from('companies')\n          .select('sector')\n          .not('sector', 'is', null)\n          .order('sector');\n      });\n\n      const sectors = [...new Set((result.data || []).map((r) => r.sector))];\n\n      // Cache for longer\n      cacheManager.set(cacheKey, sectors, this.CACHE_TTL * 4);\n\n      return sectors;\n    } catch (error) {\n      logger.error('Failed to get sectors', error);\n      return [];\n    }\n  }

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
      const result = await supabaseManager.executeQuery<{ fiscal_year: string }[]>(async (client) => {
        return await client
          .from('companies')
          .select('fiscal_year')
          .not('fiscal_year', 'is', null)
          .order('fiscal_year', { ascending: false });
      });

      const years = [...new Set((result.data || []).map((r) => r.fiscal_year))];

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