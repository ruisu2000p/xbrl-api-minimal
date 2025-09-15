import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  authenticateApiKey,
  checkRateLimit,
  preflight,
  supabaseAdmin,
  recordUsage
} from '../_shared/utils.ts'

interface QueryRequest {
  table: string
  select?: string
  filters?: Record<string, any>
  limit?: number
}

serve(async (req) => {
  const start = performance.now()

  const pf = preflight(req)
  if (pf) return pf

  try {
    const auth = await authenticateApiKey(req.headers)
    if (!auth.ok) {
      return new Response(JSON.stringify(auth.body), {
        status: auth.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const rateCheck = await checkRateLimit(auth.keyId, auth.rateLimits)
    if (!rateCheck.ok) {
      return new Response(JSON.stringify(rateCheck.body), {
        status: rateCheck.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const body = await req.json() as QueryRequest
    const { table, select = '*', filters = {}, limit = 10 } = body

    // Validate table name (whitelist approach)
    const allowedTables = ['markdown_files_metadata', 'companies']
    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: 'Invalid table name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from(table)
      .select(select)
      .limit(Math.min(limit, 100))

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'object' && value !== null) {
        // Handle complex filters like $ilike
        if (value.$ilike) {
          query = query.ilike(key, value.$ilike)
        } else if (value.$eq) {
          query = query.eq(key, value.$eq)
        } else if (value.$gte) {
          query = query.gte(key, value.$gte)
        } else if (value.$lte) {
          query = query.lte(key, value.$lte)
        } else if (value.$in) {
          query = query.in(key, value.$in)
        }
      } else {
        // Simple equality filter
        query = query.eq(key, value)
      }
    }

    // Execute query
    const { data, error: queryError } = await query

    if (queryError) {
      throw queryError
    }

    // Return results
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }

    if (rateCheck.counters) {
      const { counters } = rateCheck
      if (auth.rateLimits.perMin) {
        headers['X-RateLimit-Limit-Minute'] = String(auth.rateLimits.perMin)
        headers['X-RateLimit-Remaining-Minute'] = String(Math.max(auth.rateLimits.perMin - counters.minute, 0))
      }
      if (auth.rateLimits.perHour) {
        headers['X-RateLimit-Limit-Hour'] = String(auth.rateLimits.perHour)
        headers['X-RateLimit-Remaining-Hour'] = String(Math.max(auth.rateLimits.perHour - counters.hour, 0))
      }
      if (auth.rateLimits.perDay) {
        headers['X-RateLimit-Limit-Day'] = String(auth.rateLimits.perDay)
        headers['X-RateLimit-Remaining-Day'] = String(Math.max(auth.rateLimits.perDay - counters.day, 0))
      }
      headers['X-Plan'] = auth.plan
    }

    const latency = Math.round(performance.now() - start)
    recordUsage({
      keyId: auth.keyId,
      userId: auth.userId,
      endpoint: 'query-my-data',
      status: 200,
      latencyMs: latency
    })

    return new Response(
      JSON.stringify({
        data: data || [],
        count: data?.length || 0,
        plan: auth.plan
      }),
      { status: 200, headers }
    )

  } catch (error) {
    console.error('Error in query-my-data:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})