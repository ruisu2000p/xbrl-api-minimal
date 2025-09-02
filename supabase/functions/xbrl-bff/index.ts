/**
 * XBRL BFF (Backend for Frontend) Edge Function
 * Provides secure API access without exposing Supabase Service Keys
 */

import { supabase, STORAGE_BUCKET } from './_shared/supabase.ts';
import { requireApiKey } from './_shared/auth.ts';
import { rateLimit } from './_shared/ratelimit.ts';
import { json, logRequest, getQueryParam, getIntParam, uniqueBy } from './_shared/utils.ts';

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  let apiKey = '';
  let status = 200;
  
  try {
    // Authentication
    apiKey = requireApiKey(req);
    
    // Rate limiting
    rateLimit(apiKey);
    
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, ''); // Remove trailing slashes
    
    // CORS headers for browser access
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'x-api-key, content-type',
        },
      });
    }
    
    // Route: GET /search-company
    if (req.method === 'GET' && pathname.endsWith('/search-company')) {
      const q = getQueryParam(url, 'q', true);
      const limit = getIntParam(url, 'limit', 20, 1, 100);
      
      // Search in markdown_files_metadata table
      const { data, error } = await supabase
        .from('markdown_files_metadata')
        .select('company_id, company_name')
        .ilike('company_name', `%${q}%`)
        .limit(limit * 2); // Get more to deduplicate
      
      if (error) {
        console.error('Database error:', error);
        status = 500;
        throw new Response(
          JSON.stringify({ 
            error: 'Database error',
            message: error.message 
          }), 
          { status: 500 }
        );
      }
      
      // Deduplicate by company_id
      const companies = uniqueBy(data || [], 'company_id')
        .slice(0, limit)
        .map(({ company_id, company_name }) => ({
          company_id,
          company_name
        }));
      
      logRequest('GET', pathname, { q, limit }, apiKey, startTime, 200, {
        result_count: companies.length
      });
      
      return json(companies);
    }
    
    // Route: GET /list-md
    if (req.method === 'GET' && pathname.endsWith('/list-md')) {
      const companyId = getQueryParam(url, 'company_id', true);
      const fiscalYear = getQueryParam(url, 'fiscal_year');
      
      // Build storage path prefix
      const prefix = fiscalYear 
        ? `${companyId}/PublicDoc_markdown`
        : `${companyId}`;
      
      const files: Array<{
        path: string;
        size: number | null;
        last_modified: string | null;
      }> = [];
      
      // List files from storage
      async function listFiles(path: string) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(path, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (error) {
          console.error('Storage error:', error);
          throw error;
        }
        
        for (const item of data || []) {
          const fullPath = path ? `${path}/${item.name}` : item.name;
          
          // Check if it's a directory (no metadata.size)
          const isDirectory = !item.metadata || item.metadata.size === undefined;
          
          if (isDirectory) {
            // Recursively list subdirectory
            await listFiles(fullPath);
          } else if (item.name.toLowerCase().endsWith('.md')) {
            files.push({
              path: fullPath,
              size: item.metadata?.size || null,
              last_modified: item.metadata?.lastModified || item.updated_at || null
            });
          }
        }
      }
      
      try {
        await listFiles(prefix);
      } catch (error: any) {
        status = 500;
        logRequest('GET', pathname, { company_id: companyId, fiscal_year: fiscalYear }, 
                  apiKey, startTime, status, { error: error.message });
        
        return json({ 
          error: 'Storage error',
          message: 'Failed to list files'
        }, 500);
      }
      
      logRequest('GET', pathname, { company_id: companyId, fiscal_year: fiscalYear }, 
                apiKey, startTime, 200, { file_count: files.length });
      
      return json(files);
    }
    
    // Route: GET /get-md
    if (req.method === 'GET' && pathname.endsWith('/get-md')) {
      const path = getQueryParam(url, 'path', true);
      
      // Validate path ends with .md
      if (!path!.toLowerCase().endsWith('.md')) {
        status = 400;
        return json({ 
          error: 'Invalid path',
          message: 'Path must end with .md'
        }, 400);
      }
      
      // Download file from storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(path!);
      
      if (error) {
        status = error.message.includes('not found') ? 404 : 500;
        logRequest('GET', pathname, { path }, apiKey, startTime, status, 
                  { error: error.message });
        
        return json({ 
          error: status === 404 ? 'File not found' : 'Storage error',
          message: error.message
        }, status);
      }
      
      // Convert blob to text
      const content = await data.text();
      
      logRequest('GET', pathname, { path }, apiKey, startTime, 200, 
                { content_size: content.length });
      
      return json({ 
        path,
        content,
        size: content.length
      });
    }
    
    // No matching route
    status = 404;
    return json({ 
      error: 'Not found',
      message: `Endpoint ${pathname} not found`,
      available_endpoints: [
        '/search-company',
        '/list-md',
        '/get-md'
      ]
    }, 404);
    
  } catch (e: any) {
    // Handle thrown Response objects
    if (e instanceof Response) {
      const body = await e.text();
      try {
        const error = JSON.parse(body);
        status = e.status;
        logRequest(req.method, new URL(req.url).pathname, 
                  Object.fromEntries(new URL(req.url).searchParams), 
                  apiKey || 'unknown', startTime, status, 
                  { error: error.error });
      } catch {
        // Not JSON, just log status
        status = e.status;
      }
      return e;
    }
    
    // Handle other errors
    console.error('Unexpected error:', e);
    status = 500;
    
    logRequest(req.method, new URL(req.url).pathname, 
              Object.fromEntries(new URL(req.url).searchParams), 
              apiKey || 'unknown', startTime, status, 
              { error: e?.message || String(e) });
    
    return json({ 
      error: 'Internal server error',
      message: e?.message || 'An unexpected error occurred'
    }, 500);
  }
});