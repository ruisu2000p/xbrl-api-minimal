/**
 * Supabase Client Test
 * テスト対象: lib/supabase/client.ts
 */

import { createClientComponentClient, createServerComponentClient } from '@supabase/ssr'

// Supabaseクライアントの基本機能をテスト
describe('Supabase Client', () => {
  describe('Client Component Client', () => {
    it('should create client component client without error', () => {
      expect(() => {
        createClientComponentClient()
      }).not.toThrow()
    })

    it('should have auth methods available', () => {
      const client = createClientComponentClient()
      
      expect(client.auth).toBeDefined()
      expect(typeof client.auth.signInWithPassword).toBe('function')
      expect(typeof client.auth.signUp).toBe('function')
      expect(typeof client.auth.signOut).toBe('function')
    })

    it('should have database methods available', () => {
      const client = createClientComponentClient()
      
      expect(typeof client.from).toBe('function')
      expect(typeof client.rpc).toBe('function')
    })
  })

  describe('Server Component Client', () => {
    it('should create server component client with cookies', () => {
      const mockCookies = {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
      }

      expect(() => {
        createServerComponentClient({ cookies: () => mockCookies })
      }).not.toThrow()
    })
  })

  describe('Environment Variables', () => {
    it('should have required environment variables in test', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
    })

    it('should use test environment variables', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key')
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key')
    })
  })
})