// supabase/functions/gateway/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { corsHeaders as sharedCorsHeaders } from '../_shared/cors.ts'
import {
  authenticateApiKey,
  checkRateLimit,
  maskKey,
  recordUsage,
  supabaseAdmin,
} from '../_shared/utils.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const FUNCTION_ROUTE =
  (Deno.env.get('GATEWAY_FUNCTION_ROUTE') ?? 'gateway').replace(/^\/+|\/+$/g, '') || 'gateway';

const API_VERSION = '1.0.0';

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be configured');
}

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const functionAliases = new Set([
  FUNCTION_ROUTE,
  'gateway',
  'gateway-simple',
]);

// OpenAPI仕様
const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "XBRL Gateway API",
    version: API_VERSION,
    description: "Financial data API gateway with custom authentication"
  },
  servers: [{
    url: `${SUPABASE_URL}/functions/v1/${FUNCTION_ROUTE}`
  }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Custom API key (fin_live_*)"
      }
    },
    responses: {
      Error: {
        description: "Error response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["error", "message"],
              properties: {
                error: {
                  type: "string",
                  enum: ["unauthorized", "forbidden", "not_found", "rate_limited", "server_error"]
                },
                message: { type: "string" },
                retry_after: { type: "integer", nullable: true }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    "/config": {
      get: {
        summary: "Get MCP configuration",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Configuration for MCP client",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["version", "supabaseUrl", "supabaseAnonKey"],
                  properties: {
                    version: { type: "integer", example: 1 },
                    supabaseUrl: { type: "string", format: "uri" },
                    supabaseAnonKey: { type: "string" }
                  }
                }
              }
            },
            headers: {
              "X-RateLimit-Limit": {
                schema: { type: "integer" },
                description: "Maximum requests per minute"
              },
              "X-RateLimit-Remaining": {
                schema: { type: "integer" },
                description: "Remaining requests in current window"
              }
            }
          },
          "401": { "$ref": "#/components/responses/Error" },
          "429": { "$ref": "#/components/responses/Error" }
        }
      }
    },
    "/companies": {
      get: {
        summary: "Get company list",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 100 }
          },
          {
            name: "select",
            in: "query",
            schema: { type: "string", default: "*" }
          }
        ],
        responses: {
          "200": {
            description: "Company list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "object" }
                }
              }
            }
          }
        }
      }
    },
    "/metadata": {
      get: {
        summary: "Get markdown files metadata",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 100 }
          }
        ],
        responses: {
          "200": {
            description: "Metadata list"
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI specification",
        responses: {
          "200": {
            description: "OpenAPI spec",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    }
  }
}

// エラーレスポンス統一ヘルパー
function errorResponse(
  type: 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limited' | 'server_error',
  message?: string,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const statusMap = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    rate_limited: 429,
    server_error: 500
  } as const;

  return new Response(
    JSON.stringify({
      error: type,
      message: message || type.replace('_', ' '),
      ...extra
    }),
    {
      status: statusMap[type],
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(headers || {})
      }
    }
  );
}

Deno.serve(async (req) => {
  const started = performance.now();

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const rawPath = url.pathname;
    const normalizedFullPath = rawPath
      .replace(/%20/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*\/+\s*/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/+$/, '');

    const pathSegments = normalizedFullPath.split('/').filter(Boolean);
    let routeSegments = pathSegments;

    if (routeSegments[0] === 'functions' && routeSegments[1] === 'v1') {
      routeSegments = routeSegments.slice(2);
    }

    if (routeSegments.length && functionAliases.has(routeSegments[0])) {
      routeSegments = routeSegments.slice(1);
    }

    const subPath = routeSegments.length ? `/${routeSegments.join('/')}` : '/';
    const routeKey = subPath === '/' ? '/config' : subPath;
    const routeKeyLower = routeKey.toLowerCase();
    const normalizedForLog = normalizedFullPath || '/';

    if (
      routeKeyLower === '/openapi.json' ||
      routeKeyLower === '/openapi' ||
      normalizedForLog.toLowerCase().includes('openapi')
    ) {
      return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const clientKey = req.headers.get('x-api-key') ?? '';
    console.log(`[DEBUG] Received API key: ${clientKey ? maskKey(clientKey) : 'NONE'}`);
    console.log(`[DEBUG] Original path: ${rawPath}`);
    console.log(`[DEBUG] Normalized path: ${routeKey} (full: ${normalizedForLog})`);
    console.log(`[DEBUG] Request method: ${req.method}`);

    if (!clientKey) {
      console.log('[DEBUG] No API key provided');
      return errorResponse('unauthorized', 'API key required');
    }

    const auth = await authenticateApiKey(req.headers);
    if (!auth.ok) {
      console.log('[DEBUG] API key authentication failed');
      return new Response(JSON.stringify(auth.body), {
        status: auth.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const rateCheck = await checkRateLimit(auth.keyId, auth.rateLimits);
    if (!rateCheck.ok) {
      console.log('[DEBUG] Rate limit exceeded or unavailable');
      return new Response(JSON.stringify(rateCheck.body), {
        status: rateCheck.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    let body = '';
    let status = 200;
    let endpoint = 'gateway/config';

    switch (routeKeyLower) {
      case '/config': {
        body = JSON.stringify({
          version: 1,
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
        });
        endpoint = 'gateway/config';
        break;
      }
      case '/companies': {
        endpoint = 'gateway/companies';
        const limit = url.searchParams.get('limit') ?? '10';
        const select = url.searchParams.get('select') ?? '*';
        const parsedLimit = Number.parseInt(limit, 10);
        const safeLimit = Number.isNaN(parsedLimit)
          ? 10
          : Math.min(Math.max(parsedLimit, 1), 100);
        const { data, error } = await supabaseAdmin
          .from('companies')
          .select(select)
          .limit(safeLimit);

        if (error) {
          console.error('Companies query failed:', error);
          return errorResponse('server_error', 'Failed to load companies');
        }

        body = JSON.stringify(data ?? []);
        break;
      }
      case '/metadata': {
        endpoint = 'gateway/metadata';
        const limit = url.searchParams.get('limit') ?? '10';
        const select = url.searchParams.get('select') ?? '*';
        const parsedLimit = Number.parseInt(limit, 10);
        const safeLimit = Number.isNaN(parsedLimit)
          ? 10
          : Math.min(Math.max(parsedLimit, 1), 100);
        const { data, error } = await supabaseAdmin
          .from('markdown_files_metadata')
          .select(select)
          .limit(safeLimit);

        if (error) {
          console.error('Metadata query failed:', error);
          return errorResponse('server_error', 'Failed to load metadata');
        }

        body = JSON.stringify(data ?? []);
        break;
      }
      default: {
        body = JSON.stringify({
          ok: true,
          message: 'Gateway alive',
          version: API_VERSION,
          endpoints: ['/config', '/companies', '/metadata', '/openapi.json'],
          timestamp: new Date().toISOString(),
        });
        endpoint = 'gateway/ping';
        break;
      }
    }

    const latency = Math.round(performance.now() - started);
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION,
      'X-Plan': auth.plan,
    };

    if (rateCheck.counters) {
      const { counters } = rateCheck;
      if (auth.rateLimits.perMin) {
        headers['X-RateLimit-Limit-Minute'] = String(auth.rateLimits.perMin);
        headers['X-RateLimit-Remaining-Minute'] = String(
          Math.max(auth.rateLimits.perMin - counters.minute, 0),
        );
      }
      if (auth.rateLimits.perHour) {
        headers['X-RateLimit-Limit-Hour'] = String(auth.rateLimits.perHour);
        headers['X-RateLimit-Remaining-Hour'] = String(
          Math.max(auth.rateLimits.perHour - counters.hour, 0),
        );
      }
      if (auth.rateLimits.perDay) {
        headers['X-RateLimit-Limit-Day'] = String(auth.rateLimits.perDay);
        headers['X-RateLimit-Remaining-Day'] = String(
          Math.max(auth.rateLimits.perDay - counters.day, 0),
        );
      }
    }

    if ((rateCheck as { skipped?: boolean }).skipped) {
      headers['X-RateLimit-Notice'] = 'not_enforced';
    }

    recordUsage({
      keyId: auth.keyId,
      userId: auth.userId,
      endpoint,
      status,
      latencyMs: latency,
    }).catch((err) => console.error('Usage logging failed:', err));

    console.log(
      `Request processed: ${endpoint}, route: ${routeKeyLower}, status: ${status}, latency: ${latency}ms`,
    );

    return new Response(body, {
      status,
      headers,
    });
  } catch (error) {
    console.error('Gateway error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse('server_error', message);
  }
});
