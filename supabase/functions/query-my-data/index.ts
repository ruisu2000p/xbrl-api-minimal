import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface QueryRequest {
  table: string
  select?: string
  filters?: Record<string, any>
  limit?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, tier, usage_count, usage_limit')
      .eq('key_hash', await hashApiKey(apiKey))
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check usage limit
    if (keyData.usage_limit && keyData.usage_count >= keyData.usage_limit) {
      return new Response(
        JSON.stringify({ error: 'Usage limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
    let query = supabase
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

    // Update usage count
    await supabase
      .from('api_keys')
      .update({
        usage_count: keyData.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyData.id)

    // Return results
    return new Response(
      JSON.stringify({
        data: data || [],
        count: data?.length || 0,
        usage: {
          current: keyData.usage_count + 1,
          limit: keyData.usage_limit
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in query-my-data:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Hash API key using SHA-256
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}