/**
 * Mock utilities for NextRequest in tests
 */

// Helper function to safely convert HeadersInit to Headers
function toHeaders(init?: HeadersInit): Headers {
  const headers = new Headers();
  if (!init) return headers;

  if (init instanceof Headers) {
    // Headers.forEach has value,key order (opposite of Map)
    init.forEach((value: string, key: string) => {
      try {
        headers.set(key, value);
      } catch (e) {
        // Skip invalid header values
      }
    });
  } else if (Array.isArray(init)) {
    (init as Array<[string, string]>).forEach(([key, value]: [string, string]) => {
      try {
        headers.set(key, value);
      } catch (e) {
        // Skip invalid header values
      }
    });
  } else {
    Object.entries(init as Record<string, string>).forEach(
      ([key, value]: [string, string]) => {
        try {
          headers.set(key, value);
        } catch (e) {
          // Skip invalid header values
        }
      }
    );
  }
  return headers;
}

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

    // Use the helper function to safely handle HeadersInit
    this.headers = toHeaders(init.headers)
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
