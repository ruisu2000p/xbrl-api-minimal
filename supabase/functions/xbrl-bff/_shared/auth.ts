/**
 * Authentication module for XBRL BFF
 * Handles API key validation
 */

export function requireApiKey(req: Request): string {
  const key = req.headers.get('x-api-key') ?? '';
  
  if (!key) {
    throw new Response(
      JSON.stringify({ 
        error: 'Missing API key', 
        message: 'Please provide x-api-key header' 
      }), 
      { 
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  const expected = Deno.env.get('BFF_API_KEY') ?? '';
  
  if (!expected) {
    console.error('BFF_API_KEY environment variable not set');
    throw new Response(
      JSON.stringify({ 
        error: 'Server configuration error',
        message: 'API key validation not configured'
      }), 
      { 
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  if (key !== expected) {
    // Log invalid attempt (masked key)
    console.log(JSON.stringify({
      event: 'auth_failed',
      key_prefix: key.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    }));
    
    throw new Response(
      JSON.stringify({ 
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      }), 
      { 
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }
  
  return key;
}

/**
 * Mask API key for logging
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return 'invalid';
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}