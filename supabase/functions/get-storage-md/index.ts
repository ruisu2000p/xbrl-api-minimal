import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  authenticateApiKey,
  checkRateLimit,
  preflight,
  supabaseAdmin,
  recordUsage
} from '../_shared/utils.ts'

interface StorageRequest {
  storage_path: string
  max_bytes?: number
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
    const body = await req.json() as StorageRequest
    const { storage_path, max_bytes = 500000 } = body

    if (!storage_path) {
      return new Response(
        JSON.stringify({ error: 'Storage path required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check tier-based access
    const tierLimits = {
      free: 100000,      // 100KB
      standard: 500000,  // 500KB
      pro: 2000000,      // 2MB
      enterprise: 10000000 // 10MB
    }

    const maxAllowedBytes = tierLimits[auth.plan as keyof typeof tierLimits] || tierLimits.free
    const effectiveMaxBytes = Math.min(max_bytes, maxAllowedBytes)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('markdown-files')
      .download(storage_path)

    if (downloadError) {
      if (downloadError.message.includes('not found')) {
        return new Response(
          JSON.stringify({ error: 'File not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw downloadError
    }

    // Read file content
    const arrayBuffer = await fileData.arrayBuffer()
    const decoder = new TextDecoder()
    let content = decoder.decode(arrayBuffer)

    // Truncate if necessary
    if (content.length > effectiveMaxBytes) {
      content = content.substring(0, effectiveMaxBytes)
    }

    // Get file metadata
    const { data: metadata } = await supabaseAdmin
      .from('markdown_files_metadata')
      .select('*')
      .eq('storage_path', storage_path)
      .single()

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
      endpoint: 'get-storage-md',
      status: 200,
      latencyMs: latency
    })

    return new Response(
      JSON.stringify({
        content,
        metadata: metadata || {},
        size: content.length,
        truncated: content.length >= effectiveMaxBytes,
        plan: auth.plan
      }),
      { status: 200, headers }
    )

  } catch (error) {
    console.error('Error in get-storage-md:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})