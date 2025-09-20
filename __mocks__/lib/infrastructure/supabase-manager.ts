// Mock for supabaseManager
export const mockSupabaseClient = {
  rpc: jest.fn(),
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
};

export const supabaseManager = {
  getInstance: jest.fn(() => ({
    getServiceClient: jest.fn(() => mockSupabaseClient),
    getAnonClient: jest.fn(() => mockSupabaseClient)
  })),
  getServiceClient: jest.fn(() => mockSupabaseClient),
  getAnonClient: jest.fn(() => mockSupabaseClient)
};