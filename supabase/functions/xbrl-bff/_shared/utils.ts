/**
 * Utility functions for XBRL BFF
 */

import { maskApiKey } from './auth.ts';

/**
 * Create a JSON response
 */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate'
    },
  });
}

/**
 * Log structured request data
 */
export function logRequest(
  method: string,
  pathname: string,
  params: Record<string, any>,
  apiKey: string,
  startTime: number,
  status: number,
  details?: Record<string, any>
): void {
  const duration = Date.now() - startTime;
  
  console.log(JSON.stringify({
    event: 'api_request',
    method,
    pathname,
    params,
    api_key: maskApiKey(apiKey),
    status,
    duration_ms: duration,
    timestamp: new Date().toISOString(),
    ...details
  }));
}

/**
 * Extract and validate query parameters
 */
export function getQueryParam(
  url: URL, 
  name: string, 
  required = false,
  defaultValue?: string
): string | undefined {
  const value = url.searchParams.get(name)?.trim();
  
  if (required && !value) {
    throw new Response(
      JSON.stringify({ 
        error: 'Missing required parameter',
        message: `Parameter '${name}' is required`,
        parameter: name
      }), 
      { 
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  return value || defaultValue;
}

/**
 * Parse integer query parameter
 */
export function getIntParam(
  url: URL,
  name: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const value = url.searchParams.get(name);
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new Response(
      JSON.stringify({ 
        error: 'Invalid parameter',
        message: `Parameter '${name}' must be an integer`,
        parameter: name,
        value
      }), 
      { 
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  if (min !== undefined && parsed < min) {
    return min;
  }
  
  if (max !== undefined && parsed > max) {
    return max;
  }
  
  return parsed;
}

/**
 * Deduplicate array of objects by key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set<any>();
  const result: T[] = [];
  
  for (const item of array) {
    const value = item[key];
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }
  
  return result;
}