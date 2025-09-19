/**
 * Mock utilities for NextRequest in tests
 */

export class MockNextRequest {
  public url: string
  public nextUrl: URL
  public method: string
  public headers: Headers
  public body: any
  public cookies: any
  public geo: any
  public ip: string | undefined
  public page: any
  public ua: any

  constructor(url: string | URL, init: RequestInit = {}) {
    if (typeof url === 'string') {
      this.url = url
      this.nextUrl = new URL(url)
    } else {
      this.url = url.toString()
      this.nextUrl = url
    }
    this.method = init.method || 'GET'

    // Filter out invalid header values
    const headers = new Headers()
    if (init.headers) {
      const headerInit = init.headers
      if (headerInit instanceof Headers) {
        headerInit.forEach((value: string, key: string) => {
          try {
            headers.append(key, value)
          } catch (e) {
            // Skip invalid header values
          }
        })
      } else if (Array.isArray(headerInit)) {
        (headerInit as [string, string][]).forEach(([key, value]) => {
          try {
            headers.append(key, value)
          } catch (e) {
            // Skip invalid header values
          }
        })
      } else if (typeof headerInit === 'object') {
        Object.entries(headerInit as Record<string, string>).forEach(([key, value]) => {
          try {
            headers.append(key, value)
          } catch (e) {
            // Skip invalid header values
          }
        })
      }
    }
    this.headers = headers
    this.body = init.body

    // Mock properties for NextRequest compatibility
    this.cookies = {
      get: (name: string) => null,
      set: () => {},
      delete: () => {}
    }
    this.geo = {}
    this.ip = undefined
    this.page = null
    this.ua = null
  }
}

export class MockNextResponse<T = unknown> {
  public status: number
  public headers: Headers
  public body: T | null

  constructor(body?: T, init?: ResponseInit) {
    this.body = body ?? null
    this.status = init?.status ?? 200
    this.headers = new Headers(init?.headers)
  }

  async text(): Promise<string> {
    if (this.body === null) return ''
    if (typeof this.body === 'string') return this.body
    return JSON.stringify(this.body)
  }

  async json(): Promise<T> {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body) as T
    }
    return this.body as T
  }

  static json<T = unknown>(body: T, init?: ResponseInit) {
    const response = new MockNextResponse(body, init)
    response.headers.set('Content-Type', 'application/json')
    return response
  }

  static error() {
    return new MockNextResponse(null, { status: 500 })
  }

  static redirect(url: string | URL, status: number = 307) {
    const response = new MockNextResponse(null, { status })
    response.headers.set('Location', url.toString())
    return response
  }
}