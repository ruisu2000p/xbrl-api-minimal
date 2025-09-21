/**
 * Companies API Test
 * テスト対象: app/api/v1/companies/route.ts
 */

import { GET } from '@/app/api/v1/companies/route'
import { NextRequest } from 'next/server'

describe('/api/v1/companies', () => {
  const validApiKey = 'fin_live_test_key_12345'
  
  beforeEach(() => {
    // Supabaseクライアントのモック
    jest.clearAllMocks()
  })

  afterEach(() => {
    // リソースクリーンアップ
    jest.clearAllTimers()
  })

  afterAll(() => {
    // 非同期リソースの完全クリーンアップ
    jest.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should reject request without API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies')
      const response = await GET(request)

      expect((response as any).status).toBe(401)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        error: 'API key required',
        code: 'MISSING_API_KEY'
      })
    })

    it('should reject request with invalid API key format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies', {
        headers: {
          'X-API-Key': 'invalid_key'
        }
      })
      const response = await GET(request)

      expect((response as any).status).toBe(401)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT'
      })
    })

    it('should accept valid API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies', {
        headers: {
          'X-API-Key': validApiKey
        }
      })

      // Mock successful API key verification and data retrieval
      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: true, current_minute: 5 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { data: [], pagination: { has_more: false } },
          error: null
        })

      const response = await GET(request)
      expect((response as any).status).not.toBe(401)
    })
  })

  describe('Query Parameters', () => {
    it('should handle search query parameter', async () => {
      const url = new URL('http://localhost:3000/api/v1/companies')
      url.searchParams.set('search', 'トヨタ')
      
      const request = new NextRequest(url, {
        headers: {
          'X-API-Key': validApiKey
        }
      })

      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: true, current_minute: 5 },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                company_id: 'S100DLTX',
                company_name: 'トヨタ自動車株式会社',
                fiscal_year: 'FY2024'
              }
            ],
            pagination: { has_more: false }
          },
          error: null
        })

      const response = await GET(request)
      expect((response as any).status).toBe(200)

      const data = await (response as any).json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].company_name).toContain('トヨタ')
    })

    it('should handle fiscal_year filter', async () => {
      const url = new URL('http://localhost:3000/api/v1/companies')
      url.searchParams.set('fiscal_year', 'FY2024')
      
      const request = new NextRequest(url, {
        headers: {
          'X-API-Key': validApiKey
        }
      })

      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: true, current_minute: 5 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { data: [], pagination: { has_more: false } },
          error: null
        })

      const response = await GET(request)
      expect((response as any).status).toBe(200)

      // fiscal_yearフィルターが適用されていることを確認
      expect(mockServiceClient.rpc).toHaveBeenCalledWith(
        'get_companies_list_paginated_secure',
        expect.objectContaining({
          p_fiscal_year: 'FY2024'
        })
      )
    })

    it('should validate limit parameter', async () => {
      const url = new URL('http://localhost:3000/api/v1/companies')
      url.searchParams.set('limit', '1001') // 上限を超える値
      
      const request = new NextRequest(url, {
        headers: {
          'X-API-Key': validApiKey
        }
      })

      const response = await GET(request)
      expect((response as any).status).toBe(400)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        error: 'Security validation failed',
        code: 'SECURITY_VALIDATION_FAILED'
      })
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies', {
        headers: {
          'Authorization': `Bearer ${validApiKey}`
        }
      })

      const mockCompanies = [
        {
          company_id: 'S100DLTX',
          company_name: 'トヨタ自動車株式会社',
          fiscal_year: 'FY2024',
          document_count: 15
        },
        {
          company_id: 'S100C123',
          company_name: 'ソニーグループ株式会社',
          fiscal_year: 'FY2024',
          document_count: 12
        }
      ]

      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: true, current_minute: 5 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { data: mockCompanies, pagination: { has_more: false } },
          error: null
        })

      const response = await GET(request)
      expect((response as any).status).toBe(200)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            company_id: expect.any(String),
            company_name: expect.any(String),
            fiscal_year: expect.any(String)
          })
        ]),
        pagination: expect.any(Object),
        security: expect.objectContaining({
          validated: true
        }),
        performance: expect.objectContaining({
          latency_ms: expect.any(Number)
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies', {
        headers: {
          'Authorization': `Bearer ${validApiKey}`
        }
      })

      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: true, current_minute: 5 },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' }
        })

      const response = await GET(request)
      expect((response as any).status).toBe(500)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        error: 'Failed to fetch companies'
      })
    })

    it('should handle rate limiting', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/companies', {
        headers: {
          'Authorization': `Bearer ${validApiKey}`
        }
      })

      const { supabaseManager } = require('@/lib/infrastructure/supabase-manager')
      const mockServiceClient = supabaseManager.getServiceClient()

      mockServiceClient.rpc
        .mockResolvedValueOnce({
          data: { valid: true, tier: 'basic', key_id: 'test-key-id', user_id: 'test-user-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ok: false, retry_after: 60 },
          error: null
        })

      const response = await GET(request)
      expect((response as any).status).toBe(429)

      const data = await (response as any).json()
      expect(data).toMatchObject({
        error: 'Rate limit exceeded'
      })
    })
  })
})