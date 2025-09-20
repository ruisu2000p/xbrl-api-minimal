/**
 * Jest Test Setup
 * Configure test environment and global mocks
 */

import '@testing-library/jest-dom'

// Mock isomorphic-dompurify
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((input: string) => input), // Pass through in tests
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.API_KEY_SECRET = 'test-api-key-secret-minimum-32-chars'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
// NODE_ENV is already set to 'test' by Jest, no need to override

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  notFound: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key: string) => {
      const mockHeaders: Record<string, string> = {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-agent',
        'host': 'localhost:3000',
        'origin': 'http://localhost:3000'
      }
      return mockHeaders[key.toLowerCase()]
    }),
    has: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    forEach: jest.fn(),
  })),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn(),
        })),
        in: jest.fn(),
        order: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    rpc: jest.fn(),
  })),
}))

// Mock supabaseManager
jest.mock('@/lib/infrastructure/supabase-manager', () => ({
  supabaseManager: {
    getInstance: jest.fn(() => ({
      getServiceClient: jest.fn(() => ({
        rpc: jest.fn().mockResolvedValue({
          data: { is_valid: true, tier: 'basic', valid: true },
          error: null
        }),
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          })),
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }))
      })),
      getAnonClient: jest.fn(() => ({
        rpc: jest.fn().mockResolvedValue({
          data: { is_valid: true, tier: 'basic' },
          error: null
        }),
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        }))
      }))
    })),
    getServiceClient: jest.fn(() => ({
      rpc: jest.fn().mockResolvedValue({
        data: { is_valid: true, tier: 'basic', valid: true },
        error: null
      }),
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }))
        })),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))
    }))
  }
}))

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
  createServerClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
}))

// Global test utilities
declare global {
  var mockApiResponse: (data: any, status?: number) => Response
}

global.mockApiResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Increase test timeout for CI environments
jest.setTimeout(10000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})