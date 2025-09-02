/**
 * Token bucket rate limiting for XBRL BFF
 * Implements per-API-key rate limiting
 */

interface TokenBucket {
  tokens: number;
  updated: number;
}

// In-memory storage for rate limit buckets
const buckets = new Map<string, TokenBucket>();

// Clean up old buckets periodically
setInterval(() => {
  const now = Date.now();
  const staleTime = 60 * 60 * 1000; // 1 hour
  
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.updated > staleTime) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Apply rate limiting using token bucket algorithm
 * @param key - API key or identifier for rate limiting
 * @throws Response with 429 if rate limit exceeded
 */
export function rateLimit(key: string): void {
  const rps = Number(Deno.env.get('RATE_LIMIT_RPS') ?? '5');
  const burst = Number(Deno.env.get('RATE_LIMIT_BURST') ?? '10');
  
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: burst, updated: now };
  
  // Calculate tokens to add based on time elapsed
  const elapsedSeconds = (now - bucket.updated) / 1000;
  const tokensToAdd = elapsedSeconds * rps;
  
  // Update tokens (cap at burst limit)
  bucket.tokens = Math.min(burst, bucket.tokens + tokensToAdd);
  bucket.updated = now;
  
  // Check if request can proceed
  if (bucket.tokens < 1) {
    // Calculate retry after
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil(tokensNeeded / rps);
    
    console.log(JSON.stringify({
      event: 'rate_limit_exceeded',
      key_masked: key.substring(0, 8) + '...',
      tokens_remaining: bucket.tokens,
      retry_after: retryAfterSeconds,
      timestamp: new Date().toISOString()
    }));
    
    throw new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `Too many requests. Please retry after ${retryAfterSeconds} seconds`,
        retry_after: retryAfterSeconds
      }), 
      { 
        status: 429,
        headers: { 
          'content-type': 'application/json; charset=utf-8',
          'retry-after': String(retryAfterSeconds)
        }
      }
    );
  }
  
  // Consume a token
  bucket.tokens -= 1;
  buckets.set(key, bucket);
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): { 
  tokens_remaining: number; 
  rps: number; 
  burst: number 
} {
  const rps = Number(Deno.env.get('RATE_LIMIT_RPS') ?? '5');
  const burst = Number(Deno.env.get('RATE_LIMIT_BURST') ?? '10');
  const bucket = buckets.get(key);
  
  return {
    tokens_remaining: bucket?.tokens ?? burst,
    rps,
    burst
  };
}