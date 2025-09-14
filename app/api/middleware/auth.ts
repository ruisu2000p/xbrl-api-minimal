// API Authentication Middleware
// Handles both Supabase Auth and custom API keys with unified permissions

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AuthContext {
  type: 'supabase_auth' | 'api_key' | 'anon';
  userId?: string;
  email?: string;
  role: string;
  permissions: string[];
}

/**
 * Middleware to validate API requests
 * Supports both Supabase Auth tokens and custom API keys
 */
export async function validateRequest(request: NextRequest): Promise<AuthContext | null> {
  // Check for Supabase Auth token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      return {
        type: 'supabase_auth',
        userId: user.id,
        email: user.email,
        role: 'authenticated',
        permissions: [
          'companies.select',
          'markdown_files_metadata.select',
          'storage.objects.select',
          'api_keys.manage_own',
          'user_subscriptions.manage_own'
        ]
      };
    }
  }

  // Check for custom API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const { data, error } = await supabase.rpc('verify_api_key', {
      api_key_input: apiKey
    });

    if (!error && data && !data.error) {
      return {
        type: 'api_key',
        userId: data.user_id,
        email: data.email,
        role: data.role,
        permissions: data.permissions
      };
    }
  }

  // Default to anon access (same permissions as custom API keys for data)
  return {
    type: 'anon',
    role: 'anon',
    permissions: [
      'companies.select',
      'markdown_files_metadata.select',
      'storage.objects.select'
    ]
  };
}

/**
 * Check if user has required permission
 */
export function hasPermission(context: AuthContext, permission: string): boolean {
  return context.permissions.includes(permission);
}

/**
 * Middleware wrapper for API routes
 */
export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (req: NextRequest) => {
    const context = await validateRequest(req);

    if (!context) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (requiredPermission && !hasPermission(context, requiredPermission)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Log API usage if using custom API key
    if (context.type === 'api_key' && context.userId) {
      await supabase.from('api_usage_logs').insert({
        user_id: context.userId,
        endpoint: req.url,
        method: req.method,
        accessed_at: new Date().toISOString()
      });
    }

    return handler(req, context);
  };
}