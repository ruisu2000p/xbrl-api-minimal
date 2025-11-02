/**
 * Request ID Utilities
 *
 * Helper functions to extract request IDs from Next.js headers
 * for log correlation with Vercel Logs.
 */

import { headers } from 'next/headers';
import { setRequestId } from './server';

/**
 * Extract request ID from Vercel headers
 * Call this at the start of API route handlers
 *
 * @returns Request ID for log correlation
 */
export async function extractRequestId(): Promise<string> {
  const headersList = await headers();
  const requestId =
    headersList.get('x-vercel-id') ||
    headersList.get('x-request-id') ||
    crypto.randomUUID();

  // Set for automatic inclusion in all logs
  setRequestId(requestId);

  return requestId;
}
