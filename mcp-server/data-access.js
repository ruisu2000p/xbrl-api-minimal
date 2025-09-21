/**
 * Data Access Layer for XBRL Financial Data
 * Handles all database queries and storage operations
 */

export class DataAccessLayer {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Search for financial documents
   * @param {object} params - Search parameters
   * @returns {object} Search results
   */
  async searchDocuments(params) {
    const {
      company,
      fiscal_year,
      document_type = 'all',
      limit = 20,
      offset = 0,
      tier = 'free'
    } = params;

    // Build query
    let query = this.supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact' });

    // Apply tier-based restrictions
    if (tier === 'free') {
      // Free tier: only recent fiscal year
      query = query.in('fiscal_year', ['FY2024', 'FY2025']);
    }

    // Search by company
    if (company) {
      query = query.or(`company_name.ilike.%${company}%,company_id.ilike.%${company}%`);
    }

    // Filter by fiscal year
    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    // Filter by document type
    if (document_type !== 'all') {
      const typeMap = {
        'PublicDoc': 'PublicDoc',
        'PublicDoc_markdown': 'PublicDoc',
        'AuditDoc': 'AuditDoc',
        'AuditDoc_markdown': 'AuditDoc'
      };
      const mappedType = typeMap[document_type] || document_type;
      query = query.eq('file_type', mappedType);
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('fiscal_year', { ascending: false })
      .order('company_name', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return {
      total: count || 0,
      limit,
      offset,
      documents: data.map(this.formatDocumentMetadata)
    };
  }

  /**
   * Get document content from storage
   * @param {string} path - Document storage path
   * @param {object} options - Options
   * @returns {object} Document content and metadata
   */
  async getDocument(path, options = {}) {
    const { max_size = 1000000, tier = 'free' } = options;

    // Get metadata first
    const { data: metadata, error: metaError } = await this.supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('storage_path', path)
      .single();

    if (metaError || !metadata) {
      throw new Error('Document not found');
    }

    // Check tier restrictions
    if (tier === 'free' && !['FY2024', 'FY2025'].includes(metadata.fiscal_year)) {
      throw new Error('This document requires a premium subscription');
    }

    // Download from storage
    const { data, error } = await this.supabase.storage
      .from('markdown-files')
      .download(path);

    if (error) {
      throw new Error(`Storage error: ${error.message}`);
    }

    // Check size
    if (data.size > max_size) {
      throw new Error(`Document too large: ${data.size} bytes (max: ${max_size})`);
    }

    // Read content
    const content = await data.text();

    return {
      metadata: this.formatDocumentMetadata(metadata),
      content,
      size: data.size
    };
  }

  /**
   * List all companies
   * @param {object} params - Query parameters
   * @returns {object} Company list
   */
  async listCompanies(params = {}) {
    const {
      fiscal_year,
      limit = 50,
      offset = 0,
      tier = 'free'
    } = params;

    // Get unique companies from metadata
    let query = this.supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year');

    // Apply tier restrictions
    if (tier === 'free') {
      query = query.in('fiscal_year', ['FY2024', 'FY2025']);
    }

    if (fiscal_year) {
      query = query.eq('fiscal_year', fiscal_year);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    // Group by company
    const companies = {};
    data.forEach(row => {
      if (!companies[row.company_id]) {
        companies[row.company_id] = {
          company_id: row.company_id,
          company_name: row.company_name,
          fiscal_years: new Set()
        };
      }
      companies[row.company_id].fiscal_years.add(row.fiscal_year);
    });

    // Convert sets to arrays and paginate
    const companyList = Object.values(companies).map(c => ({
      ...c,
      fiscal_years: Array.from(c.fiscal_years).sort()
    }));

    const paginatedList = companyList.slice(offset, offset + limit);

    return {
      total: companyList.length,
      limit,
      offset,
      companies: paginatedList
    };
  }

  /**
   * Get detailed company information
   * @param {string} companyId - Company ID
   * @param {object} options - Options
   * @returns {object} Company details
   */
  async getCompanyInfo(companyId, options = {}) {
    const { tier = 'free' } = options;

    // Get company master data
    const { data: companyData } = await this.supabase
      .from('company_master')
      .select('*')
      .eq('doc_id', companyId)
      .single();

    // Get all documents
    let documentsQuery = this.supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', companyId)
      .order('fiscal_year', { ascending: false });

    // Apply tier restrictions
    if (tier === 'free') {
      documentsQuery = documentsQuery.in('fiscal_year', ['FY2024', 'FY2025']);
    }

    const { data: documents, error: docsError } = await documentsQuery;

    if (docsError) {
      throw new Error(`Query failed: ${docsError.message}`);
    }

    // Group documents by fiscal year
    const documentsByYear = {};
    documents.forEach(doc => {
      if (!documentsByYear[doc.fiscal_year]) {
        documentsByYear[doc.fiscal_year] = [];
      }
      documentsByYear[doc.fiscal_year].push(this.formatDocumentMetadata(doc));
    });

    return {
      company: {
        id: companyId,
        name: companyData?.company_name || documents[0]?.company_name || 'Unknown',
        document_name: companyData?.document_name,
        submit_date: companyData?.submit_date,
        fiscal_period: companyData?.fiscal_period
      },
      documents_count: documents.length,
      fiscal_years: Object.keys(documentsByYear).sort(),
      documents_by_year: documentsByYear
    };
  }

  /**
   * Get available fiscal years
   * @param {object} options - Options
   * @returns {array} Fiscal years with document counts
   */
  async getFiscalYears(options = {}) {
    const { tier = 'free' } = options;

    let query = this.supabase
      .from('markdown_files_metadata')
      .select('fiscal_year');

    // Apply tier restrictions
    if (tier === 'free') {
      query = query.in('fiscal_year', ['FY2024', 'FY2025']);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    // Count documents per year
    const yearCounts = {};
    data.forEach(row => {
      yearCounts[row.fiscal_year] = (yearCounts[row.fiscal_year] || 0) + 1;
    });

    return Object.entries(yearCounts)
      .map(([year, count]) => ({
        fiscal_year: year,
        document_count: count,
        available: tier !== 'free' || ['FY2024', 'FY2025'].includes(year)
      }))
      .sort((a, b) => b.fiscal_year.localeCompare(a.fiscal_year));
  }

  /**
   * Get document statistics
   * @param {object} options - Options
   * @returns {object} Statistics
   */
  async getStatistics(options = {}) {
    const { tier = 'free' } = options;

    // Get total counts
    let query = this.supabase
      .from('markdown_files_metadata')
      .select('fiscal_year, file_type, company_id', { count: 'exact' });

    if (tier === 'free') {
      query = query.in('fiscal_year', ['FY2024', 'FY2025']);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    // Calculate statistics
    const stats = {
      total_documents: count || 0,
      by_year: {},
      by_type: {},
      unique_companies: new Set()
    };

    data.forEach(row => {
      // By year
      stats.by_year[row.fiscal_year] = (stats.by_year[row.fiscal_year] || 0) + 1;

      // By type
      stats.by_type[row.file_type] = (stats.by_type[row.file_type] || 0) + 1;

      // Unique companies
      stats.unique_companies.add(row.company_id);
    });

    return {
      total_documents: stats.total_documents,
      total_companies: stats.unique_companies.size,
      documents_by_year: stats.by_year,
      documents_by_type: stats.by_type,
      tier_info: {
        current_tier: tier,
        accessible_years: tier === 'free' ? ['FY2024', 'FY2025'] : 'all'
      }
    };
  }

  /**
   * Format document metadata for response
   * @param {object} doc - Raw document metadata
   * @returns {object} Formatted metadata
   */
  formatDocumentMetadata(doc) {
    return {
      id: doc.id,
      company_id: doc.company_id,
      company_name: doc.company_name,
      fiscal_year: doc.fiscal_year,
      file_type: doc.file_type,
      file_name: doc.file_name,
      storage_path: doc.storage_path,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    };
  }

  /**
   * Batch get documents
   * @param {array} paths - Array of storage paths
   * @param {object} options - Options
   * @returns {array} Documents
   */
  async batchGetDocuments(paths, options = {}) {
    const { tier = 'free' } = options;

    // Get metadata for all paths
    const { data: metadataList, error: metaError } = await this.supabase
      .from('markdown_files_metadata')
      .select('*')
      .in('storage_path', paths);

    if (metaError) {
      throw new Error(`Query failed: ${metaError.message}`);
    }

    // Check tier restrictions
    if (tier === 'free') {
      const restrictedDocs = metadataList.filter(
        m => !['FY2024', 'FY2025'].includes(m.fiscal_year)
      );
      if (restrictedDocs.length > 0) {
        throw new Error('Some documents require a premium subscription');
      }
    }

    // Download documents in parallel
    const downloads = await Promise.allSettled(
      metadataList.map(async (metadata) => {
        const { data, error } = await this.supabase.storage
          .from('markdown-files')
          .download(metadata.storage_path);

        if (error) {
          throw new Error(`Failed to download ${metadata.storage_path}: ${error.message}`);
        }

        const content = await data.text();
        return {
          metadata: this.formatDocumentMetadata(metadata),
          content
        };
      })
    );

    // Process results
    return downloads.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          error: result.reason.message,
          path: paths[index]
        };
      }
    });
  }
}

export default DataAccessLayer;