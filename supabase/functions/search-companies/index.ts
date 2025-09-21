import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  authenticateApiKey,
  checkRateLimit,
  preflight,
  supabaseAdmin,
  recordUsage
} from '../_shared/utils.ts'

interface SearchRequest {
  query: string
  limit?: number
}

serve(async (req) => {
  const started = performance.now()

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
    const body = await req.json() as SearchRequest
    const { query, limit = 10 } = body

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search companies
    const { data: companies, error: searchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .or(`company_name.ilike.%${query}%,ticker_code.ilike.%${query}%`)
      .limit(Math.min(limit, 100))

    if (searchError) {
      throw searchError
    }

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

    const latency = Math.round(performance.now() - started)
    recordUsage({
      keyId: auth.keyId,
      userId: auth.userId,
      endpoint: 'search-companies',
      status: 200,
      latencyMs: latency
    })

    return new Response(
      JSON.stringify({
        data: companies || [],
        count: companies?.length || 0,
        plan: auth.plan
      }),
      { status: 200, headers }
    )

  } catch (error) {
    console.error('Error in search-companies:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})