import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  authenticateApiKey,
  checkRateLimit,
  corsHeaders,
  preflight,
  recordUsage,
  supabaseAdmin
} from '../_shared/utils.ts'

interface QueryRequest {
  table: string
  select?: string
  filters?: Record<string, any>
  limit?: number
}

function buildRateLimitHeaders(
  plan: string,
  limits: { perMin: number; perHour: number; perDay: number },
  counters?: { minute: number; hour: number; day: number }
) {
  const headers: Record<string, string> = {
    ...corsHeaders(),
    'Content-Type': 'application/json',
    'X-Plan': plan
  }

  if (!counters) return headers

  if (limits.perMin) {
    headers['X-RateLimit-Limit-Minute'] = String(limits.perMin)
    headers['X-RateLimit-Remaining-Minute'] = String(Math.max(limits.perMin - counters.minute, 0))
  }
  if (limits.perHour) {
    headers['X-RateLimit-Limit-Hour'] = String(limits.perHour)
    headers['X-RateLimit-Remaining-Hour'] = String(Math.max(limits.perHour - counters.hour, 0))
  }
  if (limits.perDay) {
    headers['X-RateLimit-Limit-Day'] = String(limits.perDay)
    headers['X-RateLimit-Remaining-Day'] = String(Math.max(limits.perDay - counters.day, 0))
  }

  return headers
}

serve(async (req) => {
  const start = performance.now()

  const pf = preflight(req)
  if (pf) return pf

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const subPath = segments.slice(3).join('/') || ''

  const auth = await authenticateApiKey(req.headers)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    })
  }

  const rate = await checkRateLimit(auth.keyId, auth.rateLimits)
  if (!rate.ok) {
    return new Response(JSON.stringify(rate.body), {
      status: rate.status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    })
  }

  try {
    if (req.method === 'GET' && subPath.startsWith('companies')) {
      const search = url.searchParams.get('q') ?? ''
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 100)

      let query = supabaseAdmin
        .from('companies')
        .select('*')
        .limit(limit)

      if (search) {
        query = query.or(`company_name.ilike.%${search}%,ticker_code.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      const headers = buildRateLimitHeaders(auth.plan, auth.rateLimits, rate.counters)
      const latency = Math.round(performance.now() - start)
      recordUsage({
        keyId: auth.keyId,
        userId: auth.userId,
        endpoint: 'gateway/companies',
        status: 200,
        latencyMs: latency
      })

      return new Response(
        JSON.stringify({
          data: data ?? [],
          count: data?.length ?? 0,
          plan: auth.plan
        }),
        { status: 200, headers }
      )
    }

    if (req.method === 'POST' && subPath === 'query') {
      const body = await req.json() as QueryRequest
      const { table, select = '*', filters = {}, limit = 10 } = body

      if (!table) {
        return new Response(JSON.stringify({ error: 'table is required' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        })
      }

      const allowedTables = ['markdown_files_metadata', 'companies']
      if (!allowedTables.includes(table)) {
        return new Response(JSON.stringify({ error: 'Invalid table name' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        })
      }

      let query = supabaseAdmin
        .from(table)
        .select(select)
        .limit(Math.min(limit, 100))

      for (const [key, value] of Object.entries(filters)) {
        if (value && typeof value === 'object') {
          if (value.$ilike) query = query.ilike(key, value.$ilike)
          else if (value.$eq) query = query.eq(key, value.$eq)
          else if (value.$gte) query = query.gte(key, value.$gte)
          else if (value.$lte) query = query.lte(key, value.$lte)
          else if (value.$in) query = query.in(key, value.$in)
        } else {
          query = query.eq(key, value)
        }
      }

      const { data, error } = await query
      if (error) throw error

      const headers = buildRateLimitHeaders(auth.plan, auth.rateLimits, rate.counters)
      const latency = Math.round(performance.now() - start)
      recordUsage({
        keyId: auth.keyId,
        userId: auth.userId,
        endpoint: 'gateway/query',
        status: 200,
        latencyMs: latency
      })

      return new Response(
        JSON.stringify({
          data: data ?? [],
          count: data?.length ?? 0,
          plan: auth.plan
        }),
        { status: 200, headers }
      )
    }

    if (req.method === 'GET' && subPath === 'storage') {
      const path = url.searchParams.get('path')
      const max = parseInt(url.searchParams.get('max_bytes') ?? '500000', 10)

      if (!path) {
        return new Response(JSON.stringify({ error: 'path query parameter required' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        })
      }

      const tierLimits = {
        free: 100000,
        pro: 2000000,
        enterprise: 10000000
      }
      const effectiveLimit = Math.min(max, tierLimits[auth.plan as keyof typeof tierLimits] ?? tierLimits.free)

      const { data, error } = await supabaseAdmin.storage
        .from('markdown-files')
        .download(path)

      if (error) {
        const status = error.message.includes('not found') ? 404 : 500
        return new Response(JSON.stringify({ error: status === 404 ? 'File not found' : 'Storage fetch failed' }), {
          status,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        })
      }

      const arrayBuffer = await data.arrayBuffer()
      let content = new TextDecoder().decode(arrayBuffer)
      const truncated = content.length > effectiveLimit
      if (truncated) {
        content = content.slice(0, effectiveLimit)
      }

      const { data: metadata } = await supabaseAdmin
        .from('markdown_files_metadata')
        .select('*')
        .eq('storage_path', path)
        .maybeSingle()

      const headers = buildRateLimitHeaders(auth.plan, auth.rateLimits, rate.counters)
      const latency = Math.round(performance.now() - start)
      recordUsage({
        keyId: auth.keyId,
        userId: auth.userId,
        endpoint: 'gateway/storage',
        status: 200,
        latencyMs: latency
      })

      return new Response(
        JSON.stringify({
          content,
          metadata: metadata ?? null,
          size: content.length,
          truncated,
          plan: auth.plan
        }),
        { status: 200, headers }
      )
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('gateway error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    })
  }
})
